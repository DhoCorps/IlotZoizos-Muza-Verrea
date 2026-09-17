export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { withSilice, ApiContext, handleRouteError } from '@/lib/api-guards';
import { getCachedLeaderboard } from '@/lib/cache/games.cache';

// ==========================================
// GET : Ausculter le classement des jeux (Public / Silice)
// ==========================================
export const GET = withSilice(async (req: NextRequest, _context: ApiContext) => {
  try {
    const url = new URL(req.url);
    const searchParams = url.searchParams;
    const gameType = searchParams.get('gameType');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 10;
    
    const topScores = await getCachedLeaderboard(gameType, isNaN(limit) ? 10 : limit);
    
    return NextResponse.json({ 
      success: true, 
      scores: topScores 
    }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, 'Erreur interne de la matrice lors de la récupération du classement.');
  }
});