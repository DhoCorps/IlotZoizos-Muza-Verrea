export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { BettingOrchestrator } from '@ilot/shared-core';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { revalidateTag } from 'next/cache';
import { IAssetValue } from '@ilot/types';
import { z } from 'zod';

// ==========================================
// 🛡️ SCHÉMA ZOD (Validation stricte du pari)
// ==========================================
const AssetValueSchema = z.object({
  type: z.string(),
  amount: z.number().positive(),
  entityId: z.string().optional()
});

const BetPayloadSchema = z.object({
  gameId: z.string().min(1, "L'identifiant du jeu est requis."),
  bets: z.array(AssetValueSchema).min(1, "Au moins une mise est requise."),
  targets: z.array(AssetValueSchema).optional().default([])
});

// ==========================================
// 💥 FONCTION DE CASCADE DES TAGS (CACHE)
// ==========================================
function revalidateBetCascades(userUid: string): void {
  revalidateTag('user-wallet');
  revalidateTag('game-stats');
  revalidateTag('user-assets');
  revalidateTag(`alveole-${userUid}`);
}

// ==========================================
// 🎲 POST : Placer un pari sécurisé (Moteur de Jeu & Barter)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser | null) => {
  if (!currentUser) {
    return NextResponse.json({ success: false, error: "Oiseau non identifié" }, { status: 401 });
  }

  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Corps de requête illisible ou malformé." }, { status: 400 });
    }

    // 🛡️ Blindage strict via Zod
    const validation = BetPayloadSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({ 
        success: false, 
        error: "Paramètres de pari invalides (gameId, bets ou targets requis).", 
        details: validation.error.flatten() 
      }, { status: 400 });
    }

    const { gameId, bets, targets } = validation.data;
    const userId = currentUser.uid;

    // Appel de l'orchestrateur avec le contrat de troc
    const result = await BettingOrchestrator.placeBet(
      userId, 
      gameId, 
      bets as IAssetValue[], 
      targets as IAssetValue[]
    );

    // 💥 BOOM ! Invalidation chirurgicale du cache
    revalidateBetCascades(userId);

    return NextResponse.json({
      success: true,
      ...result
    }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne du moteur de jeu.");
  }
});