// app/api/economy/kontrakt/resolve/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { KonTraKt, EconomyService } from '@ilot/infrastructure';
import { BettingOrchestrator } from '@ilot/shared-core';
import { z } from 'zod';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// 🛡️ SUTURE ZOD : Schéma local pour éviter les conflits de types inter-packages
const LocalBasketItemSchema = z.object({
  currency: z.string(),
  quantity: z.number().positive(),
  unitDhOValue: z.number().positive()
});

const ResolveKonTraKtSchema = z.object({
  kontraktId: z.string().min(1, "L'identifiant du contrat est requis"),
  isWinner: z.boolean(),
  victoryBasket: z.array(LocalBasketItemSchema).optional().default([])
});

// ==========================================
// POST : Résoudre le KonTraKt et livrer le Panier de Victoire
// ==========================================
export const POST = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "L'onde est muette : Corps de requête illisible." }, { status: 400 });

    const validation = ResolveKonTraKtSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Données de résolution corrompues.", details: validation.error.flatten() }, { status: 400 });
    }

    const { kontraktId, isWinner, victoryBasket } = validation.data;
    
    // 🛡️ Uniformisation stricte sur currentUser.uid (garanti par le gardien withAura)
    const userUid = currentUser.uid;

    // 1. Auscultation du Contrat Scellé
    const contract = await KonTraKt.findById(kontraktId);
    if (!contract) return NextResponse.json({ error: "KonTraKt introuvable dans la matrice." }, { status: 404 });
    if (contract.status !== 'accepted') return NextResponse.json({ error: "Ce KonTraKt n'est pas en phase de résolution." }, { status: 400 });

    // 2. Vérification de Souveraineté et de la Devise
    let playedCurrency: string;
    let playedAmount: number;

    if (contract.creatorId === userUid) {
      playedCurrency = contract.wagerCurrency;
      playedAmount = contract.wagerAmount;
    } else if (contract.acceptedById === userUid) {
      playedCurrency = contract.coverCurrency!;
      playedAmount = contract.coverAmount!;
    } else {
      return NextResponse.json({ error: "Souveraineté violée : Vous n'êtes pas partie prenante de ce contrat." }, { status: 403 });
    }

    // 3. Calcul par l'Orchestrateur (Intègre Neo4j et l'Indice de la Banque)
    const orchestratorResult = await BettingOrchestrator.resolveGameAndCalculateCredit(
      userUid,
      contract.gameId,
      contract.gameMode,
      contract.difficulty,
      playedCurrency,
      playedAmount,
      isWinner
    );

    // 4. Gestion de la Défaite
    if (!isWinner) {
      contract.status = 'resolved';
      await contract.save();
      return NextResponse.json({ 
        success: true, 
        message: "Défaite actée. Vos ressources ont rejoint la Banque de la Canopée." 
      }, { status: 200 });
    }

    // 5. Gestion de la Victoire et du Panier
    const creditEarned = orchestratorResult.creditEarned || 0;
    
    // 🛡️ SUTURE TYPESCRIPT : Typage explicite du sum et du item
    const totalBasketCost = victoryBasket.reduce((sum: number, item: { quantity: number; unitDhOValue: number }) => {
      return sum + (item.quantity * item.unitDhOValue);
    }, 0);

    if (totalBasketCost > creditEarned) {
      return NextResponse.json({ 
        error: `Fraude détectée : Le panier coûte ${totalBasketCost} DhÔ, mais votre crédit n'est que de ${creditEarned} DhÔ.` 
      }, { status: 400 });
    }

    // 6. Distribution des ressources physiques via EconomyService
    const resourcesToAdd: any = {};
    for (const item of victoryBasket) {
      resourcesToAdd[item.currency] = (resourcesToAdd[item.currency] || 0) + item.quantity;
    }
    
    if (Object.keys(resourcesToAdd).length > 0) {
      await EconomyService.addResources(userUid, resourcesToAdd);
    }

    // Le reliquat non dépensé est "brûlé"
    const burnedFraction = Math.floor((creditEarned - totalBasketCost) * 100) / 100;

    // 7. Clôture du contrat
    contract.status = 'resolved';
    await contract.save();

    // 8. Invalidation chirurgicale
    revalidateTag('economy');
    revalidateTag(`alveole-${userUid}`);
    revalidateTag('kontrakts');

    return NextResponse.json({
      success: true,
      message: "Victoire ! Les ressources ont été livrées dans votre Alvéole.",
      data: {
        creditEarned,
        basketCost: totalBasketCost,
        burnedFraction,
        resourcesReceived: resourcesToAdd
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error("  [KONTRAKT RESOLVE ERROR] :", error);
    const status = error.status || error.statusCode || 500;
    return NextResponse.json({ error: error.message || "Erreur lors de la résolution du contrat." }, { status });
  }
});