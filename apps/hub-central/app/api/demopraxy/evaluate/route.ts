export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { DemopraxyOrchestrator, NuisanceMetrics } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// ==========================================
// 🏛️ POST : Traiter l'évaluation démopraxique (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Corps de requête illisible ou malformé." }, { status: 400 });
    }

    const { userIdentifier, metrics } = body;

    if (!userIdentifier || !metrics) {
      return NextResponse.json({ error: "Identifiant de l'oiseau ou métriques manquants." }, { status: 400 });
    }

    const actorUid = currentUser.uid || currentUser.id;
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

  } catch (error: any) {
    console.error("🔥 Fracture interne lors de l'évaluation Démopraxique :", error);
    const status = error.statusCode || error.status || 500;
    return NextResponse.json(
      { error: error.message || "Erreur interne du vortex." }, 
      { status }
    );
  }
});