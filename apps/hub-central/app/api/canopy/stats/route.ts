export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { withSilice, ApiContext, handleRouteError } from '@/lib/api-guards';
import { getCachedCanopyStats } from '@/lib/cache/canopy.cache';

interface CanopyStatsSnapshot {
  yearMonth: string;
  macroTotals: Record<string, unknown>;
  topSellers: unknown[];
  topBuyers: unknown[];
  mostCommented: unknown[];
  mostReactive: unknown[];
}

// ==========================================
// GET : Récupérer les statistiques de la dernière diffusion Canopy (Public / Silice)
// ==========================================
export const GET = withSilice(async (_req: Request, _context: ApiContext) => {
  try {
    const latestBroadcast = await getCachedCanopyStats();
    
    if (!latestBroadcast || !latestBroadcast.metadata || typeof latestBroadcast.metadata !== 'object') {
      return NextResponse.json(
        { success: false, error: "Aucun bilan de la canopée disponible pour le moment." }, 
        { status: 404 }
      );
    }

    const metadata = latestBroadcast.metadata as Record<string, unknown>;
    
    if (!('statsSnapshot' in metadata) || !metadata.statsSnapshot) {
      return NextResponse.json(
        { success: false, error: "Aucun bilan de la canopée disponible pour le moment." }, 
        { status: 404 }
      );
    }

    const snapshot = metadata.statsSnapshot as CanopyStatsSnapshot;

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

  } catch (error: unknown) {
    // 🛡️ Utilisation du gestionnaire d'erreur global (zéro 'any')
    return handleRouteError(error, "Erreur interne de la régulation.");
  }
});