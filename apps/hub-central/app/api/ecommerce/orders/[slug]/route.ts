export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { OrderModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { IOrder } from '@ilot/types';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { getCachedOrder } from '@/lib/cache/ecommerce.cache';

// ==========================================
// 💥 FONCTION DE CASCADE DES TAGS (CACHE)
// ==========================================
function revalidateOrderCascades(identifier: string, uid?: string, buyerUid?: string): void {
  revalidateTag('orders');
  revalidateTag(`order-${identifier}`);
  if (uid && uid !== identifier) {
    revalidateTag(`order-${uid}`);
  }
  if (buyerUid) {
    revalidateTag(`user-orders-${buyerUid}`);
  }
}

// ==========================================
// GET : Ausculter une commande spécifique (Strictement Privé / Aura)
// ==========================================
export const GET = withAura(async (_req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const userUid = currentUser.uid;
    const isAdmin = currentUser.capabilities?.includes('ADMIN') || false;

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

    // On essaie d'abord via le cache ou le helper unifié
    let order = await getCachedOrder(identifier) as IOrder | null;
    if (!order) {
      order = await findEntityBySlugOrUid(OrderModel, identifier) as IOrder | null;
    }

    if (!order) {
      return NextResponse.json({ success: false, error: "Commande introuvable dans le grand livre de l'îlot." }, { status: 404 });
    }

    if (order.buyerUid !== userUid && !isAdmin) {
      return NextResponse.json({ success: false, error: "Accès refusé à cette transaction." }, { status: 403 });
    }

    return NextResponse.json(order, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors de la lecture de la commande.");
  }
});

// ==========================================
// PATCH : Mettre à jour le statut d'une commande (Strictement Privé / Aura)
// ==========================================
export const PATCH = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const userUid = currentUser.uid;
    const isAdmin = currentUser.capabilities?.includes('ADMIN') || false;

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

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Corps de requête illisible." }, { status: 400 });
    }

    const bodyData = body as { status?: string };

    // 🔍 Recherche unifiée stricte et unique : on fait confiance à notre helper !
    const order = await findEntityBySlugOrUid(OrderModel, identifier, { lean: false }) as (IOrder & { save: () => Promise<unknown> }) | null;

    if (!order) {
      return NextResponse.json({ success: false, error: "Commande introuvable." }, { status: 404 });
    }

    if (order.buyerUid !== userUid && !isAdmin) {
      return NextResponse.json({ success: false, error: "Action non autorisée sur cette commande." }, { status: 403 });
    }

    if (bodyData.status && ['PENDING', 'PAID', 'COMPLETED', 'CANCELLED'].includes(bodyData.status)) {
      order.status = bodyData.status as IOrder['status'];
      await order.save();
    }
    
    // 💥 Invalidation chirurgicale du cache en cascade via notre helper dédié
    revalidateOrderCascades(identifier, order.uid, order.buyerUid);

    return NextResponse.json({ 
       success: true, 
       message: "Statut de la commande mis à jour avec succès.", 
      data: order 
    }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors de la mise à jour de la commande.");
  }
});