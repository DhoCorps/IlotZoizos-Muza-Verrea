export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MarketRegulationOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// ==========================================
// ⚖️ POST : Traiter la régulation connectée du marché (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Corps de requête illisible ou malformé." }, { status: 400 });
    }

    const { userIdentifier, takeValue, currentNeeds, creationFactor } = body;

    if (userIdentifier === undefined || takeValue === undefined) {
      return NextResponse.json({ error: "Paramètres de régulation du marché manquants." }, { status: 400 });
    }

    const actorUid = currentUser.uid || currentUser.id;
    const capabilities = currentUser.capabilities || [];

    const signature: ActionSignature = {
      actorUid,
      capabilities
    };

    const orchestrator = new MarketRegulationOrchestrator();
    const result = await orchestrator.processConnectedRegulation(
      userIdentifier, 
      Number(takeValue), 
      Number(currentNeeds || 1), 
      Number(creationFactor || 1), 
      signature
    );

    // 💥 Invalidation chirurgicale du cache en cascade pour actualiser le marché
    revalidateTag('marketplace');
    revalidateTag('market-regulation');

    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Fracture interne lors de la régulation du marché :", error);
    const status = error.statusCode || error.status || 500;
    return NextResponse.json(
      { error: error.message || "Erreur interne de la régulation." }, 
      { status }
    );
  }
});