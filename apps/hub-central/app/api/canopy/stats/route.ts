export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MessageModel } from '@ilot/infrastructure';
import { unstable_cache } from 'next/cache';
import { withSilice, ApiContext } from '@/lib/api-guards';

// 🛡️ CACHE SÉCURISÉ : Bypass automatique en mode test
async function getCachedCanopyStats() {
  const fetcher = async () => {
    return await MessageModel.findOne({ isSystemBroadcast: true })
      .sort({ createdAt: -1 })
      .lean();
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  return await unstable_cache(
    fetcher,
    ['canopy-stats-latest'],
    { revalidate: 3600, tags: ['canopy-stats', 'messages'] } // Cache long (1h) car mis à jour rarement
  )();
}

// ==========================================
// 📊 GET : Bilan de la Canopée (Public / Silice)
// ==========================================
export const GET = withSilice(async (req: Request, _context: ApiContext) => {
  try {
    const latestBroadcast = await getCachedCanopyStats();

    if (!latestBroadcast || !(latestBroadcast as any).metadata?.statsSnapshot) {
      return NextResponse.json({ success: false, message: "Aucun bilan de la canopée disponible pour le moment." }, { status: 404 });
    }

    const snapshot = (latestBroadcast as any).metadata.statsSnapshot;

    return NextResponse.json({
      success: true,
      yearMonth: snapshot.yearMonth,
      macroTotals: snapshot.macroTotals,
      topSellers: snapshot.topSellers,
      topBuyers: snapshot.topBuyers,
      mostCommented: snapshot.mostCommented,
      mostReactive: snapshot.mostReactive,
      broadcastedAt: (latestBroadcast as any).createdAt
    }, { status: 200 });

  } catch (error: any) {
    console.error('🔥 [CANOPY STATS ERROR] :', error);
    const status = error.status || error.statusCode || 500;
    return NextResponse.json({ success: false, error: error.message || "Erreur interne." }, { status });
  }
});