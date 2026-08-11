export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { BettingOrchestrator } from '@ilot/shared-core';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { revalidateTag } from 'next/cache';
import { IAssetValue } from '@ilot/types';

// ==========================================
// 🎲 POST : Placer un pari sécurisé (Moteur de Jeu & Barter)
// ==========================================
export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser | null) => {
  if (!currentUser) {
    return NextResponse.json({ error: "Oiseau non identifié" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Corps de requête illisible ou malformé." }, { status: 400 });
    }

    // On accepte des tableaux d'actifs (bets et targets)
    const { gameId, bets, targets } = body;

    if (!gameId || !Array.isArray(bets) || bets.length === 0 || !Array.isArray(targets)) {
      return NextResponse.json({ error: "Paramètres de pari invalides (gameId, bets ou targets requis)." }, { status: 400 });
    }

    const userId = currentUser.uid || currentUser.id;

    // Appel de l'orchestrateur avec le contrat de troc
    const result = await BettingOrchestrator.placeBet(userId, gameId, bets as IAssetValue[], targets as IAssetValue[]);

    // Invalidation du cache des actifs et des stats
    revalidateTag('user-wallet');
    revalidateTag('game-stats');
    revalidateTag('user-assets');

    return NextResponse.json({
      success: true,
      ...result
    }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Fracture lors du lancer de dé du pari :", error);
    const status = error.statusCode || error.status || 500;
    return NextResponse.json(
      { error: error.message || "Erreur interne du moteur de jeu." }, 
      { status }
    );
  }
});