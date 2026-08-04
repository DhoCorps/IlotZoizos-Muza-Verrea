// apps/hub-central/app/api/ecommerce/market/regulate/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { connectToDatabase } from '@ilot/infrastructure';
import { MarketRegulationOrchestrator } from '@ilot/shared-core';
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
    const { userIdentifier, takeValue, currentNeeds, creationFactor } = body;

    if (userIdentifier === undefined || takeValue === undefined) {
      return NextResponse.json({ error: "Paramètres de régulation du marché manquants" }, { status: 400 });
    }

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

    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Fracture interne lors de la régulation du marché :", error);
    return NextResponse.json(
      { error: error.message || "Erreur interne de la régulation" }, 
      { status: error.status || 500 }
    );
  }
}