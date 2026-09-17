export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { DemopraxyOrchestrator, NuisanceMetrics } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

// ==========================================
// 🛡️ SCHÉMA ZOD (Validation stricte de l'évaluation démopraxique)
// ==========================================
const DemopraxyEvalSchema = z.object({
  userIdentifier: z.string().min(1, "L'identifiant de l'oiseau est requis."),
  metrics: z.object({
    systemicHatredScore: z.number().min(0).max(10),
    recurrenceCount: z.number().min(0),
    recalibrationCapacity: z.number().min(0.1).max(10),
    collectiveResonance: z.number(),
  }).passthrough(), // Autorise des métriques additionnelles si besoin tout en validant le noyau
});

// ==========================================
// 🏛️ POST : Traiter l'évaluation démopraxique (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Corps de requête illisible ou malformé." }, { status: 400 });
    }

    // 🛡️ Validation stricte via Zod
    const validationResult = DemopraxyEvalSchema.safeParse(rawBody);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues.map(e => e.message).join(', ');
      return NextResponse.json({ success: false, error: `Paramètres d'évaluation manquants ou invalides : ${errorMessage}` }, { status: 400 });
    }

    const { userIdentifier, metrics } = validationResult.data;

    // 🛡️ Uniformisation stricte sur currentUser.uid (garanti par le gardien withAura)
    const actorUid = currentUser.uid;
    const capabilities = currentUser.capabilities || [];

    const signature: ActionSignature = {
      actorUid,
      capabilities
    };

    const orchestrator = new DemopraxyOrchestrator();
    const result = await orchestrator.processDemopraxicEvaluation(
      userIdentifier, 
      metrics as NuisanceMetrics, 
      signature
    );

    // 💥 Invalidation chirurgicale du cache en cascade pour les données démopraxiques
    revalidateTag('demopraxy');
    revalidateTag(`demopraxy-${userIdentifier}`);
    revalidateTag(`demopraxy-actor-${actorUid}`);

    return NextResponse.json(result, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne du vortex.");
  }
});