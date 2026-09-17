export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { withSilice, ApiContext, handleRouteError } from '@/lib/api-guards';
import { getCachedGraphData } from '@/lib/cache/context.cache';

// ==========================================
// GET : Lecture contextuelle du Graphe (Silice)
// ==========================================
export const GET = withSilice(async (req: NextRequest, _context: ApiContext) => {
  try {
    const url = new URL(req.url);
    const rootUid = url.searchParams.get('uid');
    
    if (!rootUid) {
      return NextResponse.json({ nodes: [], links: [] }, { status: 200 });
    }
    
    const data = await getCachedGraphData(rootUid);
    return NextResponse.json(data, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, "Le maillage est illisible.");
  }
});