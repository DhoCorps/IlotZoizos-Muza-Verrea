export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { EcommerceOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { IlotError } from '@ilot/shared-core';
import { z } from 'zod';

// ==========================================
// SCHÉMA ZOD : Validation du payload de la roulette
// ==========================================
const SpinRouletteSchema = z.object({
  productUid: z.string().min(1, "L'identifiant de l'artefact (productUid) est requis."),
});

// ==========================================
// POST : Lancer la Roue Karmique (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Corps de requête illisible ou malformé." }, { status: 400 });
    }

    // Validation stricte du contrat Zod
    const validation = SpinRouletteSchema.safeParse(rawBody);
    if (!validation.success) {
      const errorMessage = validation.error.issues.map(e => e.message).join(', ');
      return NextResponse.json({ success: false, error: `Contrat souverain invalide : ${errorMessage}` }, { status: 400 });
    }

    const { productUid } = validation.data;
    const buyerUid = currentUser.uid;

    const signature: ActionSignature = {
      actorUid: buyerUid,
      capabilities: currentUser.capabilities || []
    };

    const orchestrator = new EcommerceOrchestrator();
    
    // Appel de la méthode de l'orchestrateur gérant le karma et les verrouillages 24h
    const result = await orchestrator.spinKarmicRoulette(buyerUid, productUid, signature);

    return NextResponse.json({
      success: true,
      message: "La Roue Karmique a tourné avec succès.",
      data: result
    }, { status: 200 });

  } catch (error: unknown) {
    // Gestion spécifique des erreurs levées par l'orchestrateur (ex: 403 verrouillage, 402 fonds insuffisants)
    if (error instanceof IlotError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    return handleRouteError(error, "Erreur interne lors du lancement de la Roue Karmique.");
  }
});