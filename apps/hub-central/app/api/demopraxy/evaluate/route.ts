// apps/hub-central/app/api/demopraxy/evaluate/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { connectToDatabase } from '@ilot/infrastructure';
import { DemopraxyOrchestrator, NuisanceMetrics } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    
    const session = await getServerSession(authOptions);
    const actorUid = (session?.user as any)?.uid;
    const capabilities = (session?.user as any)?.capabilities || [];

    if (!actorUid) {
      return NextResponse.json({ error: "Oiseau non identifié" }, { status: 401 });
    }

    const body = await req.json();
    const { userIdentifier, metrics } = body;

    if (!userIdentifier || !metrics) {
      return NextResponse.json({ error: "Identifiant de l'oiseau ou métriques manquants" }, { status: 400 });
    }

    const signature: ActionSignature = {
      actorUid,
      capabilities
    };

    const orchestrator = new DemopraxyOrchestrator();
    const result = await orchestrator.processDemopraxicEvaluation(userIdentifier, metrics as NuisanceMetrics, signature);

    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Fracture interne lors de l'évaluation Démopraxique :", error);
    return NextResponse.json(
      { error: error.message || "Erreur interne du vortex" }, 
      { status: error.status || 500 }
    );
  }
}