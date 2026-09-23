export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { EcommerceOrchestrator, IlotError } from '@ilot/shared-core';
import { RouletteModel } from '@ilot/infrastructure';
import { ActionSignature } from '@ilot/types';
import { z } from 'zod';

// ==========================================
// SCHÉMA ZOD : Validation du payload
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
    
    // Appel de la méthode de l'orchestrateur pour le tirage karmique[cite: 3]
    const result = await orchestrator.spinKarmicRoulette(buyerUid, productUid, signature);

    // Récupération de la date d'expiration (24h) enregistrée dans la session
    let expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (result.sessionUid) {
      const sessionDoc = await RouletteModel.findOne({ uid: result.sessionUid }).lean() as { expiresAt?: Date } | null;
      if (sessionDoc?.expiresAt) {
        expiresAt = sessionDoc.expiresAt;
      }
    }

    return NextResponse.json({
      success: true,
      message: "La Roue Karmique a tourné avec succès.",
      data: {
        sessionUid: result.sessionUid,
        priceCents: result.price,
        expiresAt,
      }
    }, { status: 200 });

  } catch (error: unknown) {
    if (error instanceof IlotError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    return handleRouteError(error, "Erreur interne lors du lancement de la Roue Karmique.");
  }
});