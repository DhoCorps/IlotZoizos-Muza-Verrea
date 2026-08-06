import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { connectToDatabase } from '@ilot/infrastructure';
import { MarketRegulationOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';

export async function POST(req: Request) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR MARKET REGULATE]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }
    
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR MARKET REGULATE]", sessionErr);
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
    } catch (parseErr) {
      return NextResponse.json({ error: "Corps de requête illisible ou malformé." }, { status: 400 });
    }

    const { userIdentifier, takeValue, currentNeeds, creationFactor } = body;

    if (userIdentifier === undefined || takeValue === undefined) {
      return NextResponse.json({ error: "Paramètres de régulation du marché manquants" }, { status: 400 });
    }

    const signature: ActionSignature = {
      actorUid,
      capabilities
    };

    let result;
    try {
      const orchestrator = new MarketRegulationOrchestrator();
      result = await orchestrator.processConnectedRegulation(
        userIdentifier, 
        Number(takeValue), 
        Number(currentNeeds || 1), 
        Number(creationFactor || 1), 
        signature
      );
    } catch (orchErr: any) {
      console.error("🔥 [MARKET ORCHESTRATOR ERROR]", orchErr);
      const status = orchErr.statusCode || 400;
      return NextResponse.json({ error: orchErr.message || "Échec de l'évaluation de régulation." }, { status });
    }

    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Fracture interne lors de la régulation du marché :", error);
    return NextResponse.json(
      { error: error.message || "Erreur interne de la régulation" }, 
      { status: error.status || 500 }
    );
  }
}