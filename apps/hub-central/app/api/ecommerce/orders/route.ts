// Fichier : app/api/orders/[slug]/route.ts (ou équivalent)
export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { OrderModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { IlotError } from '@ilot/shared-core';
import { v4 as uuidv4 } from 'uuid';


// 🛡️ Utilitaire interne de normalisation des erreurs HTTP
function handleRouteError(error: any, defaultMessage: string) {
  console.error("🔥 [ORDERS ROUTE ERROR] :", error);
  // Extraction propre du code de statut : IlotError (status/statusCode) ou code numérique direct
  const status = error instanceof IlotError 
    ? (typeof error.status === 'number' ? error.status : parseInt(error.status as string, 10) || 500) 
    : (error.statusCode || error.status || 500);
    
  const message = error instanceof IlotError || error.message ? error.message : defaultMessage;
  return NextResponse.json({ error: message }, { status: isNaN(status) ? 500 : status });
}

// ==========================================
// GET : Ausculter une commande spécifique
// ==========================================
export const GET = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ error: "Identifiant de commande invalide." }, { status: 400 });
    }

    const order: any = await findEntityBySlugOrUid(OrderModel, identifier);
    if (!order) {
      return NextResponse.json({ error: "Commande introuvable dans le grand livre." }, { status: 404 });
    }

    // Contrôle de souveraineté : Seul l'acheteur, le vendeur ou l'architecte peut voir la commande
    const isBuyer = order.buyerUid === currentUser.uid;
    const isSeller = order.sellerUid === currentUser.uid;
    const isArchitect = currentUser.capabilities?.includes('*');

    if (!isBuyer && !isSeller && !isArchitect) {
      return NextResponse.json({ error: "Souveraineté violée : accès refusé à cette commande." }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: order }, { status: 200 });
  } catch (error: any) {
    return handleRouteError(error, "Erreur interne lors de la consultation de la commande.");
  }
});

// ==========================================
// DELETE / PUT : Gestion des mutations ou annulations de commandes
// ==========================================
export const DELETE = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ error: "Identifiant de commande invalide." }, { status: 400 });
    }

    const order: any = await findEntityBySlugOrUid(OrderModel, identifier);
    if (!order) {
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }

    const isBuyer = order.buyerUid === currentUser.uid;
    const isArchitect = currentUser.capabilities?.includes('*');

    if (!isBuyer && !isArchitect) {
      return NextResponse.json({ error: "Seul l'acheteur ou un architecte peut annuler cette transaction." }, { status: 403 });
    }

    try {
      await OrderModel.updateOne({ uid: order.uid }, { $set: { status: 'CANCELLED' } });
    } catch (dbErr) {
      throw new IlotError("Échec de l'annulation de la commande dans la Silice.");
    }

    revalidateTag('orders');
    revalidateTag(`order-${identifier}`);
    if (order.buyerUid) revalidateTag(`user-orders-${order.buyerUid}`);

    return NextResponse.json({ success: true, message: "Commande annulée avec succès." }, { status: 200 });
  } catch (error: any) {
    return handleRouteError(error, "Erreur interne lors de l'annulation de la commande.");
  }
});


// ==========================================
// POST : Sédimentation d'une nouvelle commande
// ==========================================
export const POST = withAura(async (req: NextRequest | Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const body = await req.json().catch(() => null);
    
    if (!body) {
      return NextResponse.json({ error: "Corps de requête illisible ou malformé." }, { status: 400 });
    }

    const { items, totalAmount, currency } = body;

    const newOrder = await OrderModel.create({
      uid: `ord_${uuidv4()}`,
      buyerUid: currentUser.uid,
      items: items || [],
      totalAmount: totalAmount || 0,
      currency: currency || 'EUR',
      status: 'PAID'
    });

    // 💥 Invalidation globale et centralisée en cascade
    revalidateTag('orders');
    revalidateTag('ecommerce');
    revalidateTag(`user-orders-${currentUser.uid}`);

    return NextResponse.json({ success: true, data: newOrder }, { status: 201 });
  } catch (error: any) {
    console.error("🔥 [ORDERS POST ERROR] :", error);
    return NextResponse.json({ error: "Erreur interne lors de la création de la commande." }, { status: 500 });
  }
});