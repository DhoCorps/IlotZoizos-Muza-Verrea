// Fichier : app/api/orders/[slug]/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { OrderModel } from '@ilot/infrastructure';
import mongoose from 'mongoose';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { getCachedOrder } from '@/lib/cache/ecommerce.cache';

// ==========================================
// GET : Ausculter une commande spécifique (Strictement Privé / Aura)
// ==========================================
export const GET = withAura(async (_req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const userUid = currentUser.uid || currentUser.id;
    const isAdmin = currentUser.capabilities?.includes('ADMIN') || false;
    const resolvedParams = await context.params;
    const rawSlug = (resolvedParams as any)?.slug;
    if (!rawSlug) {
      return NextResponse.json({ error: "Identifiant de commande invalide." }, { status: 400 });
    }
    const order = await getCachedOrder(rawSlug);
    if (!order) {
      return NextResponse.json({ error: "Commande introuvable dans le grand livre de l'îlot." }, { status: 404 });
    }
    if ((order as any).buyerUid !== userUid && !isAdmin) {
      return NextResponse.json({ error: "Accès refusé à cette transaction." }, { status: 403 });
    }
    return NextResponse.json(order, { status: 200 });
  } catch (error: any) {
    console.error("  Erreur fatale GET Order Details :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
});

// ==========================================
// PATCH : Mettre à jour le statut d'une commande (Strictement Privé / Aura)
// ==========================================
export const PATCH = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const userUid = currentUser.uid || currentUser.id;
    const isAdmin = currentUser.capabilities?.includes('ADMIN') || false;
    const resolvedParams = await context.params;
    const rawSlug = (resolvedParams as any)?.slug;
    if (!rawSlug) {
      return NextResponse.json({ error: "Identifiant de commande invalide." }, { status: 400 });
    }
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }
    const queryId = mongoose.isValidObjectId(rawSlug) ? rawSlug : null;
    const order = await OrderModel.findOne({ 
       $or: [{ uid: rawSlug }, { _id: queryId }] 
    });
    if (!order) {
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }
    if ((order as any).buyerUid !== userUid && !isAdmin) {
      return NextResponse.json({ error: "Action non autorisée sur cette commande." }, { status: 403 });
    }
    if (body.status && ['PENDING', 'PAID', 'COMPLETED', 'CANCELLED'].includes(body.status)) {
      (order as any).status = body.status;
      await (order as any).save();
    }
    
    // 💥 Invalidation chirurgicale du cache en cascade
    revalidateTag('orders');
    revalidateTag(`order-${rawSlug}`);
    if ((order as any).uid) {
      revalidateTag(`order-${(order as any).uid}`);
    }
    if ((order as any).buyerUid) {
      revalidateTag(`user-orders-${(order as any).buyerUid}`);
    }
    return NextResponse.json({ 
       success: true, 
       message: "  Statut de la commande mis à jour avec succès.", 
       data: order 
    }, { status: 200 });
  } catch (error: any) {
    console.error("  Erreur fatale PATCH Order :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
});