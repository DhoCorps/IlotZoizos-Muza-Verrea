// apps/hub-central/app/api/sovereign/purge/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { connectToDatabase } from '@ilot/infrastructure';
import { SovereignPurgeOrchestrator, PurgeContext } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    
    const session = await getServerSession(authOptions);
    const actorUid = (session?.user as any)?.uid;
    const capabilities = (session?.user as any)?.capabilities || [];

    if (!actorUid) {
      return NextResponse.json({ error: "Oiseau non identifié dans la canopée." }, { status: 401 });
    }

    const body = await req.json();
    const { entityId, reason } = body;

    if (!entityId || !reason) {
      return NextResponse.json({ error: "Contexte de purge incomplet." }, { status: 400 });
    }

    const signature: ActionSignature = {
      actorUid,
      capabilities
    };

    const context: PurgeContext = {
      entityId,
      reason
    };

    const orchestrator = new SovereignPurgeOrchestrator();
    const result = await orchestrator.executeSovereignPurge(context, signature);

    return NextResponse.json({
      success: true,
      message: "L'évanescence a dissous toutes les traces de l'entité.",
      result
    }, { status: 200 });

  } catch (error: any) {
    console.error("🌋 Fracture lors de la purge souveraine :", error);
    return NextResponse.json(
      { error: error.message || "Erreur interne lors de la dissolution." }, 
      { status: error.status || 500 }
    );
  }
}