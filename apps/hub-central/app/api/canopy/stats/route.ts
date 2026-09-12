// Fichier : app/api/canopy/stats/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { withSilice, ApiContext } from '@/lib/api-guards';
import { getCachedCanopyStats } from '@/lib/cache/canopy.cache';

export const GET = withSilice(async (req: Request, _context: ApiContext) => {
  try {
    const latestBroadcast = await getCachedCanopyStats();
    if (!latestBroadcast || !latestBroadcast.metadata || !('statsSnapshot' in latestBroadcast.metadata)) {
      return NextResponse.json(
        { success: false, message: "Aucun bilan de la canopée disponible pour le moment." }, 
        { status: 404 }
      );
    }
    const snapshot = (latestBroadcast.metadata as any).statsSnapshot;
    return NextResponse.json({
      success: true,
      yearMonth: snapshot.yearMonth,
      macroTotals: snapshot.macroTotals,
      topSellers: snapshot.topSellers,
      topBuyers: snapshot.topBuyers,
      mostCommented: snapshot.mostCommented,
      mostReactive: snapshot.mostReactive,
      broadcastedAt: latestBroadcast.createdAt
    }, { status: 200 });
  } catch (error: any) {
    console.error('  [CANOPY STATS ERROR] :', error);
    const status = error.statusCode || error.status || 500;
    return NextResponse.json(
      { success: false, error: error.message || "Erreur interne de la régulation." }, 
      { status }
    );
  }
});