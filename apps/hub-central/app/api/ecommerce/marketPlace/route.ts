export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ProductModel } from '@ilot/infrastructure';
import { unstable_cache } from 'next/cache';
import { withSilice, ApiContext } from '@/lib/api-guards';

// 🧠 CACHE SÉCURISÉ : Recensement des artefacts du Marketplace filtrés (30s) avec bypass en mode test
async function getCachedMarketplaceProducts(category?: string | null, style?: string | null, author?: string | null) {
  const fetcher = async () => {
    const query: Record<string, any> = {};
    
    if (category && category !== 'ALL') {
      query.category = category;
    }
    
    if (style && style !== 'ALL') {
      query.$or = [
        { style: { $regex: style, $options: 'i' } },
        { tags: { $in: [new RegExp(style, 'i')] } }
      ];
    }
    
    if (author && author !== 'ALL') {
      query.author = { $regex: author, $options: 'i' };
    }

    const products = await ProductModel.find(query).sort({ createdAt: -1 }).lean();

    // 🕸️ ENRICHISSEMENT POUR LA RÉSONANCE
    return products.map((product: any) => ({
      ...product,
      authorSlug: product.authorSlug || product.ownerUid || product.storeOwnerUid || null
    }));
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  const cacheKey = `marketplace-${category || 'all'}-${style || 'all'}-${author || 'all'}`;
  return await unstable_cache(
    fetcher,
    [cacheKey],
    { 
      revalidate: 30, 
      tags: [
        'marketplace', 
        ...(category && category !== 'ALL' ? [`marketplace-category-${category}`] : [])
      ] 
    }
  )();
}

// ==========================================
// 🔍 GET : Recenser le Marketplace (Public / Silice)
// ==========================================
export const GET = withSilice(async (req: Request, _context: ApiContext) => {
  try {
    const url = new URL(req.url);
    const searchParams = url.searchParams;
    const category = searchParams.get('category');
    const style = searchParams.get('style');
    const author = searchParams.get('author');

    const enrichedProducts = await getCachedMarketplaceProducts(category, style, author);

    return NextResponse.json({ success: true, data: enrichedProducts }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur lors du recensement du Marketplace :", error);
    return NextResponse.json({ error: error.message || "Erreur interne de la Marketplace." }, { status: 500 });
  }
});