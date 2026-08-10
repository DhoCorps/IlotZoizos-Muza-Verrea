export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ProductModel, OiseauModel } from '@ilot/infrastructure';
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '@/lib/slugify';
import { unstable_cache, revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// 🧠 CACHE SÉCURISÉ : Récupération des artefacts filtrés (30s) with bypass en mode test
async function getCachedProducts(storeUid?: string | null, category?: string | null) {
  const fetcher = async () => {
    const query: any = {};
    if (storeUid) query.storeUid = storeUid;
    if (category) query.category = category;
    return await ProductModel.find(query).sort({ createdAt: -1 }).lean();
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  const cacheKey = `products-${storeUid || 'all'}-${category || 'all'}`;
  return await unstable_cache(
    fetcher,
    [cacheKey],
    { 
      revalidate: 30, 
      tags: ['products', ...(storeUid ? [`store-products-${storeUid}`] : []), ...(category ? [`category-${category}`] : [])] 
    }
  )();
}

// ==========================================
// 🔍 GET : Recenser les artefacts du catalogue (Public / Silice)
// ==========================================
export const GET = withSilice(async (req: Request, _context: ApiContext) => {
  try {
    const url = new URL(req.url);
    const storeUid = url.searchParams.get('storeUid');
    const category = url.searchParams.get('category');

    const products = await getCachedProducts(storeUid, category);
    return NextResponse.json(products, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur lors de la lecture des artefacts :", error);
    return NextResponse.json({ error: error.message || "Échec de la lecture." }, { status: 500 });
  }
});

// ==========================================
// 🚀 POST : Ajouter un artefact au catalogue (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const userUid = currentUser.uid || currentUser.id;

    // 🛡️ DOUANE VIBRATOIRE : Vérification du Tribunal de la Canopée
    const oiseauProfile = await OiseauModel.findOne({ uid: userUid }).lean() as any;
    if (oiseauProfile && (oiseauProfile.isBanned || oiseauProfile.profileStatus === 'INDESIRABLE')) {
      return NextResponse.json({ 
        error: "Souveraineté restreinte : Votre fréquence est jugée indésirable. Le dépôt d'artefacts vous est interdit." 
      }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    const productUid = `prod_${uuidv4()}`;

    // 1. Génération sécurisée et unique du Slug avec garde-fou anti-boucle
    const baseSlug = slugify(body.title || 'artefact');
    let finalSlug = baseSlug;
    
    let slugExists = await ProductModel.findOne({ slug: finalSlug }).lean();
    let counter = 1;
    let safetyCounter = 0;

    while (slugExists && safetyCounter < 50) {
      finalSlug = `${baseSlug}-${counter}`;
      slugExists = await ProductModel.findOne({ slug: finalSlug }).lean();
      counter++;
      safetyCounter++;
    }

    // 2. Enregistrement en base de données
    const newProduct = await ProductModel.create({
      ...body,
      uid: productUid,
      slug: finalSlug,
      sellerUid: body.sellerUid || userUid
    });

    // 💥 Invalidation chirurgicale du cache en cascade
    revalidateTag('products');
    if (body.storeUid) {
      revalidateTag(`store-products-${body.storeUid}`);
    }

    return NextResponse.json({
      success: true,
      message: "Artefact ajouté au catalogue de l'Îlot.",
      data: newProduct
    }, { status: 201 });

  } catch (error: any) {
    console.error("🔥 Fracture lors de l'ajout de l'artefact :", error);
    return NextResponse.json({ error: error.message || "Échec de l'ajout." }, { status: 500 });
  }
});