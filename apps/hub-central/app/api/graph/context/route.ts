// Fichier : app/api/context/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { withSilice, ApiContext } from '@/lib/api-guards';
import { getCachedGraphData } from '@/lib/cache/context.cache';

// ==========================================
// GET : Lecture contextuelle du Graphe (Silice)[cite: 14]
// ==========================================
export const GET = withSilice(async (req: Request, _context: ApiContext) => {
  try {
    const url = new URL(req.url);
    const rootUid = url.searchParams.get('uid');
    
    if (!rootUid) {
      return NextResponse.json({ nodes: [], links: [] }, { status: 200 });
    }
    
    const data = await getCachedGraphData(rootUid);
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error("  Fracture lors de la lecture contextuelle du Graphe :", error);
    return NextResponse.json({ nodes: [], links: [], message: "Le maillage est illisible." }, { status: 500 });
  }
});