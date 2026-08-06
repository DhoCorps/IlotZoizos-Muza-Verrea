// apps/hub-central/app/api/games/leaderboard/route.ts
import { NextResponse } from 'next/server';
import { GameResultModel } from '@ilot/infrastructure'; // Assure-toi que le modèle est exporté ici

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const gameType = searchParams.get('gameType'); // ex: 'KoOonTreez', 'WikiOracle', ou 'all'
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const query = gameType && gameType !== 'all' ? { gameType } : {};

    // Récupération des meilleurs scores triés par score décroissant
    const topScores = await GameResultModel.find(query)
      .sort({ score: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ success: true, scores: topScores });
  } catch (err) {
    console.error('[Leaderboard API] Erreur lors de la récupération :', err);
    return NextResponse.json({ success: false, error: 'Erreur interne de la matrice' }, { status: 500 });
  }
}