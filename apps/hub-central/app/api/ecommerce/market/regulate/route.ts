export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { MarketRegulationOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

// ==========================================
// 🛡️ SCHÉMA ZOD (Validation stricte de la régulation du marché)
// ==========================================
const MarketRegulationSchema = z.object({
  userIdentifier: z.string().min(1, "L'identifiant de l'oiseau est requis."),
  takeValue: z.number({ message: "La valeur de prélèvement (takeValue) doit être un nombre." }),
  currentNeeds: z.number().optional().default(1),
  creationFactor: z.number().optional().default(1),
});

// ==========================================
// POST : Régulation du marché (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Corps de requête illisible ou malformé." }, { status: 400 });
    }

    // 🛡️ Validation stricte via Zod
    const validationResult = MarketRegulationSchema.safeParse(rawBody);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues.map(e => e.message).join(', ');
      return NextResponse.json({ success: false, error: `Paramètres de régulation manquants ou invalides : ${errorMessage}` }, { status: 400 });
    }

    const { userIdentifier, takeValue, currentNeeds, creationFactor } = validationResult.data;

    const actorUid = currentUser.uid;
    const capabilities = currentUser.capabilities || [];
    const signature: ActionSignature = {
      actorUid,
      capabilities
    };

    const orchestrator = new MarketRegulationOrchestrator();
    const result = await orchestrator.processConnectedRegulation(
      userIdentifier, 
      takeValue, 
      currentNeeds, 
      creationFactor, 
      signature
    );

    // 💥 Invalidation chirurgicale du cache en cascade
    revalidateTag('marketplace');
    revalidateTag('market-regulation');

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne de la régulation.");
  }
});