export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { GameResultModel } from '@ilot/infrastructure';
import { unstable_cache } from 'next/cache';
import { withSilice, ApiContext } from '@/lib/api-guards';

// 🧠 CACHE SÉCURISÉ : Récupération du classement filtré (30s) avec bypass en mode test
async function getCachedLeaderboard(gameType: string | null, limit: number) {
  const fetcher = async () => {
    const query = gameType && gameType !== 'all' ? { gameType } : {};
    return await GameResultModel.find(query)
      .sort({ score: -1 })
      .limit(limit)
      .lean();
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  const cacheKey = `leaderboard-${gameType || 'all'}-${limit}`;
  return await unstable_cache(
    fetcher,
    [cacheKey],
    { 
      revalidate: 30, 
      tags: ['leaderboard', 'games', ...(gameType && gameType !== 'all' ? [`leaderboard-${gameType}`] : [])] 
    }
  )();
}

// ==========================================
// 🏆 GET : Ausculter le classement des jeux (Public / Silice)
// ==========================================
export const GET = withSilice(async (req: Request, _context: ApiContext) => {
  try {
    const url = new URL(req.url);
    const searchParams = url.searchParams;
    const gameType = searchParams.get('gameType');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const topScores = await getCachedLeaderboard(gameType, limit);

    return NextResponse.json({ success: true, scores: topScores }, { status: 200 });

  } catch (err: any) {
    console.error('[Leaderboard API] Erreur lors de la récupération :', err);
    return NextResponse.json({ success: false, error: err.message || 'Erreur interne de la matrice' }, { status: 500 });
  }
});