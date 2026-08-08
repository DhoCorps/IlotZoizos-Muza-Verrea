export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ProductModel } from '@ilot/infrastructure';
import { EcommerceOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { slugify } from '@/lib/slugify';
import { unstable_cache, revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// 🧠 CACHE SÉCURISÉ : Récupération d'un artefact par slug ou uid (30s) avec bypass en mode test
async function getCachedProduct(slug: string) {
  const fetcher = async () => {
    return await ProductModel.findOne({ 
      $or: [{ slug: slug }, { uid: slug }] 
    }).lean();
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  return await unstable_cache(
    fetcher,
    [`product-${slug}`],
    { revalidate: 30, tags: ['products', `product-${slug}`] }
  )();
}

// ==========================================
// 🔍 GET : Ausculter un artefact par son slug ou uid (Public / Silice)
// ==========================================
export const GET = withSilice(async (_req: Request, context: ApiContext) => {
  try {
    const resolvedParams = await context.params;
    const rawSlug = (resolvedParams as any)?.slug;
    
    if (!rawSlug) {
      return NextResponse.json({ error: "Slug de produit invalide." }, { status: 400 });
    }
    
    const slug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    const product = await getCachedProduct(slug);

    if (!product) {
      return NextResponse.json({ error: "Artefact introuvable dans l'Îlot." }, { status: 404 });
    }

    return NextResponse.json(product, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur GET Product :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
});

// ==========================================
// 🗑️ DELETE : Retirer / Dissoudre un artefact de la matrice (Strictement Privé / Aura)
// ==========================================
export const DELETE = withAura(async (_req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const userUid = currentUser.uid || currentUser.id;
    const sessionCaps = currentUser.capabilities || [];

    const resolvedParams = await context.params;
    const rawSlug = (resolvedParams as any)?.slug;

    if (!rawSlug) {
      return NextResponse.json({ error: "Slug de produit invalide." }, { status: 400 });
    }

    const slug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    const product = await ProductModel.findOne({ 
      $or: [{ slug: slug }, { uid: slug }] 
    });

    if (!product) {
      return NextResponse.json({ error: "Artefact introuvable." }, { status: 404 });
    }

    const signature: ActionSignature = {
      actorUid: userUid,
      capabilities: sessionCaps
    };

    const ecommerceOrch = new EcommerceOrchestrator();
    if (typeof (ecommerceOrch as any).removeProduct === 'function') {
      await (ecommerceOrch as any).removeProduct(product.uid, signature);
    } else {
      await ProductModel.deleteOne({ uid: product.uid });
    }

    // 💥 Invalidation chirurgicale du cache en cascade
    revalidateTag('products');
    revalidateTag(`product-${slug}`);
    revalidateTag(`product-${product.uid}`);
    if (product.storeUid) {
      revalidateTag(`store-products-${product.storeUid}`);
    }

    return NextResponse.json({ success: true, message: "L'artefact a été retiré de la matrice." }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur DELETE Product :", error);
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status });
  }
});