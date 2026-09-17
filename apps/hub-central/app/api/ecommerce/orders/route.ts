export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { OrderModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { IOrder } from '@ilot/types';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { IlotError } from '@ilot/shared-core';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// ==========================================
// 🛡️ SCHÉMA ZOD (Validation stricte de création de commande)
// ==========================================
const CreateOrderSchema = z.object({
  items: z.array(
    z.object({
      productUid: z.string().optional(),
      title: z.string().optional(),
      priceCents: z.number().optional(),
      quantity: z.number().optional(),
    }).passthrough()
  ).optional().default([]),
  totalAmount: z.number().optional().default(0),
  currency: z.string().optional().default('EUR'),
});

// ==========================================
// 💥 FONCTION DE CASCADE DES TAGS (CACHE)
// ==========================================
function revalidateOrderCascades(identifier?: string, uid?: string, buyerUid?: string): void {
  revalidateTag('orders');
  revalidateTag('ecommerce');
  if (identifier) {
    revalidateTag(`order-${identifier}`);
  }
  if (uid && uid !== identifier) {
    revalidateTag(`order-${uid}`);
  }
  if (buyerUid) {
    revalidateTag(`user-orders-${buyerUid}`);
  }
}

// ==========================================
// GET : Ausculter une commande spécifique (ou route de collection)
// ==========================================
export const GET = withAura(async (_req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    let resolvedParams: { slug?: string | string[] } | undefined;
    try {
      resolvedParams = await context.params;
    } catch {
      return NextResponse.json({ success: false, error: "Paramètres de route invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ success: false, error: "Identifiant de commande invalide." }, { status: 400 });
    }

    const order = await findEntityBySlugOrUid(OrderModel, identifier) as IOrder | null;
    if (!order) {
      return NextResponse.json({ success: false, error: "Commande introuvable dans le grand livre." }, { status: 404 });
    }

    // Contrôle de souveraineté : Seul l'acheteur, le vendeur ou l'architecte peut voir la commande
    const isBuyer = order.buyerUid === currentUser.uid;
    const isSeller = (order as unknown as { sellerUid?: string }).sellerUid === currentUser.uid;
    const isArchitect = currentUser.capabilities?.includes('*') || false;

    if (!isBuyer && !isSeller && !isArchitect) {
      return NextResponse.json({ success: false, error: "Souveraineté violée : accès refusé à cette commande." }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: order }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors de la consultation de la commande.");
  }
});

// ==========================================
// DELETE : Gestion des annulations de commandes
// ==========================================
export const DELETE = withAura(async (_req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    let resolvedParams: { slug?: string | string[] } | undefined;
    try {
      resolvedParams = await context.params;
    } catch {
      return NextResponse.json({ success: false, error: "Paramètres de route invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ success: false, error: "Identifiant de commande invalide." }, { status: 400 });
    }

    const order = await findEntityBySlugOrUid(OrderModel, identifier) as IOrder | null;
    if (!order) {
      return NextResponse.json({ success: false, error: "Commande introuvable." }, { status: 404 });
    }

    const isBuyer = order.buyerUid === currentUser.uid;
    const isArchitect = currentUser.capabilities?.includes('*') || false;

    if (!isBuyer && !isArchitect) {
      return NextResponse.json({ success: false, error: "Seul l'acheteur ou un architecte peut annuler cette transaction." }, { status: 403 });
    }

    try {
      await OrderModel.updateOne({ uid: order.uid }, { $set: { status: 'CANCELLED' } });
    } catch {
      throw new IlotError("Échec de l'annulation de la commande dans la Silice.", "INTERNAL_ERROR", 500);
    }

    // Invalidation via notre fonction de cascade dédiée
    revalidateOrderCascades(identifier, order.uid, order.buyerUid);

    return NextResponse.json({ success: true, message: "Commande annulée avec succès." }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors de l'annulation de la commande.");
  }
});

// ==========================================
// POST : Sédimentation d'une nouvelle commande
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Corps de requête illisible ou malformé." }, { status: 400 });
    }

    // Validation stricte via Zod
    const validationResult = CreateOrderSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return NextResponse.json({ success: false, error: "Corps de requête illisible ou malformé." }, { status: 400 });
    }

    const { items, totalAmount, currency } = validationResult.data;

    const newOrder = await OrderModel.create({
      uid: `ord_${uuidv4()}`,
      buyerUid: currentUser.uid,
      items,
      totalAmount,
      currency,
      status: 'PAID'
    });

    // 💥 Invalidation globale et centralisée en cascade via notre helper
    revalidateOrderCascades(newOrder.uid, newOrder.uid, currentUser.uid);

    return NextResponse.json({ success: true, data: newOrder }, { status: 201 });
  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors de la création de la commande.");
  }
});