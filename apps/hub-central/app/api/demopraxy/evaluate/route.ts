import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { connectToDatabase } from '@ilot/infrastructure';
import { DemopraxyOrchestrator, NuisanceMetrics } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';

export async function POST(req: Request) {
  try {
    try {
      await connectToDatabase();
    } catch (dbError) {
      console.error("❌ [DB ERROR DEMOPRAXY]", dbError);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }
    
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionError) {
      console.error("🔥 [SESSION ERROR]", sessionError);
      return NextResponse.json({ error: "Erreur lors de la vérification de la session." }, { status: 500 });
    }

    const actorUid = (session?.user as any)?.uid;
    const capabilities = (session?.user as any)?.capabilities || [];

    if (!actorUid) {
      return NextResponse.json({ error: "Oiseau non identifié" }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return NextResponse.json({ error: "Corps de requête illisible ou malformé." }, { status: 400 });
    }

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