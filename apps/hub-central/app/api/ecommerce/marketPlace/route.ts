export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { withSilice, ApiContext, handleRouteError } from '@/lib/api-guards';
import { getCachedMarketplaceProducts } from '@/lib/cache/ecommerce.cache';

// ==========================================
// GET : Recenser le Marketplace (Public / Silice)
// ==========================================
export const GET = withSilice(async (req: NextRequest, _context: ApiContext) => {
  try {
    let url: URL;
    try {
      url = new URL(req.url);
    } catch {
      return NextResponse.json({ success: false, error: "URL de requête invalide." }, { status: 400 });
    }

    const searchParams = url.searchParams;
    const category = searchParams.get('category');
    const style = searchParams.get('style');
    const author = searchParams.get('author');
    
    const enrichedProducts = await getCachedMarketplaceProducts(category, style, author);
    return NextResponse.json({ success: true, data: enrichedProducts }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne de la Marketplace.");
  }
});