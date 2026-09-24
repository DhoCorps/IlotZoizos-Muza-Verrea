export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { ProductModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { IProduct } from '@ilot/types';
import { EcommerceOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext, handleRouteError, assertEntitySovereignty } from '@/lib/api-guards';
import { getCachedProduct } from '@/lib/cache/ecommerce.cache';

// ==========================================
// GET : Ausculter un artefact par son slug ou uid (Public / Silice)
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
      return NextResponse.json({ success: false, error: "Slug de produit invalide." }, { status: 400 });
    }
          
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    
    // Tentative via le cache, puis repli sur le helper unifié ou la base de données
    let product = await getCachedProduct(identifier) as IProduct | null;
    if (!product) {
      product = await findEntityBySlugOrUid(ProductModel, identifier) as IProduct | null;
    }

    if (!product) {
      return NextResponse.json({ success: false, error: "Artefact introuvable dans l'îlot." }, { status: 404 });
    }
    
    // ✨ OPTIMISATION PERF/SEO : Mise en cache CDN (Edge) pour alléger la DB sur les produits
    const response = NextResponse.json(product, { status: 200 });
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    
    return response;
  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors de la consultation du produit.");
  }
});

// ==========================================
// DELETE : Retirer / Dissoudre un artefact de la matrice (Strictement Privé / Aura)
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
      return NextResponse.json({ success: false, error: "Slug de produit invalide." }, { status: 400 });
    }

    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    // 🔍 Utilisation de notre helper unifié (Slug ou UID)
    const product = await findEntityBySlugOrUid(ProductModel, identifier) as IProduct | null;
    if (!product) {
      return NextResponse.json({ success: false, error: "Artefact introuvable." }, { status: 404 });
    }

    // 🛡️ Application stricte du contrôle de souveraineté d'entité
    const ownerFieldUid = product.ownerUid || (product as unknown as { sellerUid?: string }).sellerUid;
    assertEntitySovereignty({ uid: currentUser.uid, capabilities: currentUser.capabilities }, ownerFieldUid || '');

    const signature: ActionSignature = {
      actorUid: userUid,
      capabilities: sessionCaps
    };

    const ecommerceOrch = new EcommerceOrchestrator();
    if (typeof (ecommerceOrch as unknown as { removeProduct?: Function }).removeProduct === 'function') {
      await ecommerceOrch.removeProduct(product.uid, signature);
    } else {
      await ProductModel.deleteOne({ uid: product.uid });
    }
    
    // 💥 Invalidation chirurgicale du cache en cascade
    revalidateTag('products');
    revalidateTag(`product-${identifier}`);
    revalidateTag(`product-${product.uid}`);
    if (product.storeUid) {
      revalidateTag(`store-products-${product.storeUid}`);
    }

    return NextResponse.json({ success: true, message: "L'artefact a été retiré de la matrice." }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors de la suppression de l'artefact.");
  }
});