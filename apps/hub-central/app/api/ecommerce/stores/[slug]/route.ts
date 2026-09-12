// Fichier : app/api/stores/[slug]/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { StoreModel } from '@ilot/infrastructure';
import { EcommerceOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { getCachedStore } from '@/lib/cache/ecommerce.cache';

// ==========================================
// GET : Ausculter une boutique par son slug ou uid (Public / Silice)
// ==========================================
export const GET = withSilice(async (_req: Request, context: ApiContext) => {
  try {
    const resolvedParams = await context.params;
    const rawSlug = (resolvedParams as any)?.slug;
         
    if (!rawSlug) {
      return NextResponse.json({ error: "Identifiant de boutique invalide." }, { status: 400 });
    }
         
    const slug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    const store = await getCachedStore(slug);
    if (!store) {
      return NextResponse.json({ error: "Boutique introuvable dans la Silice." }, { status: 404 });
    }
    return NextResponse.json(store, { status: 200 });
  } catch (error: any) {
    console.error("  Erreur GET Store :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
});

// ==========================================
// DELETE : Dissolution / Fermeture d'une Boutique (Strictement Privé / Aura)
// ==========================================
export const DELETE = withAura(async (_req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const userUid = currentUser.uid;
    const sessionCaps = currentUser.capabilities || [];
    const resolvedParams = await context.params;
    const rawSlug = (resolvedParams as any)?.slug;
    if (!rawSlug) {
      return NextResponse.json({ error: "Identifiant de boutique invalide." }, { status: 400 });
    }
    const slug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    const store = await StoreModel.findOne({ 
       $or: [{ slug: slug }, { uid: slug }] 
    });
    if (!store) {
      return NextResponse.json({ error: "Boutique introuvable." }, { status: 404 });
    }
    const signature: ActionSignature = {
      actorUid: userUid,
      capabilities: sessionCaps
    };
    const ecommerceOrch = new EcommerceOrchestrator();
    if (typeof (ecommerceOrch as any).dissolveStore === 'function') {
      await (ecommerceOrch as any).dissolveStore(store.uid, signature);
    } else {
      await StoreModel.deleteOne({ uid: store.uid });
    }
    
    // 💥 Invalidation chirurgicale du cache en cascade
    revalidateTag('stores');
    revalidateTag(`store-${slug}`);
    revalidateTag(`store-${store.uid}`);
    return NextResponse.json({ success: true, message: "La boutique a été dissoute de la matrice." }, { status: 200 });
  } catch (error: any) {
    console.error("  Erreur DELETE Store :", error);
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status });
  }
});