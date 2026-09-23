export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { StoreModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { IStore } from '@ilot/types';
import { EcommerceOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext, handleRouteError, assertEntitySovereignty } from '@/lib/api-guards';
import { getCachedStore } from '@/lib/cache/ecommerce.cache';

// ==========================================
// 💥 FONCTION DE CASCADE DES TAGS (CACHE)
// ==========================================
function revalidateStoreCascades(identifier?: string, uid?: string, slug?: string, ownerUid?: string): void {
  revalidateTag('stores');
  revalidateTag('verified-stores');
  revalidateTag('ecommerce');
  if (identifier) {
    revalidateTag(`store-${identifier}`);
  }
  if (uid && uid !== identifier) {
    revalidateTag(`store-${uid}`);
  }
  if (slug && slug !== identifier) {
    revalidateTag(`store-${slug}`);
  }
  if (ownerUid) {
    revalidateTag(`user-stores-${ownerUid}`);
    revalidateTag(`merchant-products-${ownerUid}`);
  }
}

// ==========================================
// GET : Ausculter une boutique par son slug ou uid (Public / Silice)
// ==========================================
export const GET = withSilice(async (_req: NextRequest, context: ApiContext) => {
  try {
    let resolvedParams: { slug?: string | string[] } | undefined;
    try {
      resolvedParams = await context.params;
    } catch {
      return NextResponse.json({ success: false, error: "Paramètres de route invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    if (!rawSlug) {
      return NextResponse.json({ success: false, error: "Identifiant de boutique invalide." }, { status: 400 });
    }
         
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    
    // Tentative via le cache, puis repli sur le helper unifié
    let store = await getCachedStore(identifier) as IStore | null;
    if (!store) {
      store = await findEntityBySlugOrUid(StoreModel, identifier) as IStore | null;
    }

    if (!store) {
      return NextResponse.json({ success: false, error: "Boutique introuvable dans la Silice." }, { status: 404 });
    }
    return NextResponse.json(store, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors de la consultation de la boutique.");
  }
});

// ==========================================
// DELETE : Dissolution / Fermeture d'une Boutique (Strictement Privé / Aura)
// ==========================================
export const DELETE = withAura(async (_req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const userUid = currentUser.uid;
    const sessionCaps = currentUser.capabilities || [];

    let resolvedParams: { slug?: string | string[] } | undefined;
    try {
      resolvedParams = await context.params;
    } catch {
      return NextResponse.json({ success: false, error: "Paramètres de route invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    if (!rawSlug) {
      return NextResponse.json({ success: false, error: "Identifiant de boutique invalide." }, { status: 400 });
    }

    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    // 🔍 Utilisation de notre helper unifié (Slug ou UID)
    const store = await findEntityBySlugOrUid(StoreModel, identifier) as IStore | null;
    if (!store) {
      return NextResponse.json({ success: false, error: "Boutique introuvable." }, { status: 404 });
    }

    // 🛡️ Application stricte du contrôle de souveraineté d'entité
    assertEntitySovereignty({ uid: currentUser.uid, capabilities: currentUser.capabilities }, store.ownerUid || '');

    const signature: ActionSignature = {
      actorUid: userUid,
      capabilities: sessionCaps
    };

    // ⚙️ Synchronisation et suppression atomique via l'Orchestrateur
    const ecommerceOrch = new EcommerceOrchestrator();
    await ecommerceOrch.dissolveStore(store.uid, signature);
    
    // 💥 Invalidation chirurgicale du cache en cascade via notre helper dédié
    revalidateStoreCascades(identifier, store.uid, store.slug, store.ownerUid);

    return NextResponse.json({ success: true, message: "La boutique a été dissoute de la matrice." }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors de la dissolution de la boutique.");
  }
});