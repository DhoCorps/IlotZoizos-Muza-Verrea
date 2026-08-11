export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MessageModel, IMessageDocument } from '@ilot/infrastructure';
import { unstable_cache } from 'next/cache';
import { withSilice, ApiContext } from '@/lib/api-guards';

// 🛡️ CACHE SÉCURISÉ : Bypass automatique en mode test
async function getCachedCanopyStats() {
  const fetcher = async () => {
    // Utilisation du typage IMessageDocument pour éviter 'as any'
    return await MessageModel.findOne({ isSystemBroadcast: true })
      .sort({ createdAt: -1 })
      .lean<IMessageDocument>()
      .exec();
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  return await unstable_cache(
    fetcher,
    ['canopy-stats-latest'],
    { revalidate: 3600, tags: ['canopy-stats', 'messages'] }
  )();
}

// ==========================================
// 📊 GET : Bilan de la Canopée (Public / Silice)
// ==========================================
export const GET = withSilice(async (req: Request, _context: ApiContext) => {
  try {
    const latestBroadcast = await getCachedCanopyStats();

    // Vérification stricte avec typage protégé
    if (!latestBroadcast || !latestBroadcast.metadata || !('statsSnapshot' in latestBroadcast.metadata)) {
      return NextResponse.json(
        { success: false, message: "Aucun bilan de la canopée disponible pour le moment." }, 
        { status: 404 }
      );
    }

    // Extraction sécurisée des données
    const snapshot = latestBroadcast.metadata.statsSnapshot;

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
    console.error('🔥 [CANOPY STATS ERROR] :', error);
    const status = error.statusCode || error.status || 500;
    return NextResponse.json(
      { success: false, error: error.message || "Erreur interne de la régulation." }, 
      { status }
    );
  }
});