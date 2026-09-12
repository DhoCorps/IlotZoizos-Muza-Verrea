// Fichier : app/api/marketPlace/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { withSilice, ApiContext } from '@/lib/api-guards';
import { getCachedMarketplaceProducts } from '@/lib/cache/ecommerce.cache';

// ==========================================
// GET : Recenser le Marketplace (Public / Silice)[cite: 17]
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
    console.error("  Erreur lors du recensement du Marketplace :", error);
    return NextResponse.json({ error: error.message || "Erreur interne de la Marketplace." }, { status: 500 });
  }
});