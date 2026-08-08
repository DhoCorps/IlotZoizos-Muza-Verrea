export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { GameResultModel } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// ==========================================
// 🎮 POST : Sauvegarder un résultat de jeu (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const body = await req.json();
    const { gameType, score, trophies, maxStreak } = body;

    // Validation rapide des données essentielles
    if (!gameType || score === undefined) {
      return NextResponse.json(
        { error: "Données de jeu incomplètes. Le type de jeu et le score sont requis." },
        { status: 400 }
      );
    }

    const username = currentUser.slug || currentUser.id || currentUser.uid || 'Oiseau Inconnu';

    // 1. Sédimentation du résultat dans la base de données
    const result = await GameResultModel.create({
      username,
      userUid: currentUser.uid,
      gameType,
      finalScore: score,
      trophies: trophies || 0,
      maxStreak: maxStreak || 0,
    });

    // 💥 Invalidation chirurgicale du cache des classements (leaderboards)
    revalidateTag('game-leaderboard');
    if (gameType) {
      revalidateTag(`leaderboard-${gameType}`);
    }

    return NextResponse.json({
      success: true,
      message: "Résultat de jeu sédimenté avec succès.",
      id: result._id,
    }, { status: 201 });

  } catch (error: any) {
    console.error("🔥 Fracture lors de la sédimentation du résultat de jeu :", error);
    return NextResponse.json(
      { error: error.message || "Échec de l'enregistrement du score." },
      { status: 500 }
    );
  }
});