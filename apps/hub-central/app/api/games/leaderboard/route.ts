// Fichier : app/api/games/leaderboard/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { withSilice, ApiContext } from '@/lib/api-guards';
import { getCachedLeaderboard } from '@/lib/cache/games.cache';

// ==========================================
// GET : Ausculter le classement des jeux (Public / Silice)[cite: 15]
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