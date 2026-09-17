export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { GameResultModel } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

// ==========================================
// 🛡️ SCHÉMA ZOD (Validation stricte du résultat de jeu)
// ==========================================
const GameResultPayloadSchema = z.object({
  gameType: z.string().min(1, "Le type de jeu est requis."),
  score: z.number({ 
    message: "Le score doit être un nombre." 
  }),
  trophies: z.number().optional().default(0),
  maxStreak: z.number().optional().default(0)
});

// ==========================================
// 💥 FONCTION DE CASCADE DES TAGS (CACHE)
// ==========================================
function revalidateLeaderboardCascades(gameType?: string): void {
  revalidateTag('game-leaderboard');
  if (gameType) {
    revalidateTag(`leaderboard-${gameType}`);
  }
}

// ==========================================
// 🎮 POST : Sauvegarder un résultat de jeu (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Corps de requête illisible ou malformé." }, { status: 400 });
    }

    // 🛡️ Blindage strict via Zod
    const validation = GameResultPayloadSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({ 
        success: false, 
        error: "Données de jeu incomplètes. Le type de jeu et le score sont requis.",
        details: validation.error.flatten() 
      }, { status: 400 });
    }

    const { gameType, score, trophies, maxStreak } = validation.data;

    // 🛡️ Uniformisation : Utilisation du slug ou de l'UID canonique garanti par le gardien
    const username = currentUser.slug || currentUser.uid || 'Oiseau Inconnu';

    // 1. Sédimentation du résultat dans la base de données
    const result = await GameResultModel.create({
      username,
      userUid: currentUser.uid,
      gameType,
      finalScore: score,
      trophies,
      maxStreak,
    });

    // 💥 Invalidation chirurgicale du cache des classements
    revalidateLeaderboardCascades(gameType);

    return NextResponse.json({
      success: true,
      message: "Résultat de jeu sédimenté avec succès.",
      id: (result._id as { toString: () => string }).toString(),
    }, { status: 201 });

  } catch (error: unknown) {
    return handleRouteError(error, "Échec de l'enregistrement du score.");
  }
});