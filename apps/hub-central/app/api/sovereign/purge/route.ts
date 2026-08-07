import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from '@ilot/infrastructure';
import { SovereignPurgeOrchestrator, PurgeContext } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';

export async function POST(req: Request) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR SOVEREIGN PURGE]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }
    
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR SOVEREIGN PURGE]", sessionErr);
      return NextResponse.json({ error: "Erreur de lecture d'Aura (session)." }, { status: 500 });
    }

    const actorUid = (session?.user as any)?.uid;
    const capabilities = (session?.user as any)?.capabilities || [];

    if (!actorUid) {
      return NextResponse.json({ error: "Oiseau non identifié dans la canopée." }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "Ordre de purge illisible." }, { status: 400 });
    }

    const { entityId, reason } = body;

    if (!entityId || !reason) {
      return NextResponse.json({ error: "Contexte de purge incomplet." }, { status: 400 });
    }

    const signature: ActionSignature = { actorUid, capabilities };
    const context: PurgeContext = { entityId, reason };

    let result;
    try {
      const orchestrator = new SovereignPurgeOrchestrator();
      result = await orchestrator.executeSovereignPurge(context, signature);
    } catch (orchErr: any) {
      console.error("🌋 [PURGE ORCHESTRATOR ERROR]", orchErr);
      const status = orchErr.status || orchErr.statusCode || 500;
      return NextResponse.json(
        { error: orchErr.message || "Erreur interne lors de la dissolution." }, 
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "L'évanescence a dissous toutes les traces de l'entité.",
      result
    }, { status: 200 });

  } catch (error: any) {
    console.error("🌋 Fracture globale lors de la purge souveraine :", error);
    return NextResponse.json({ error: "Erreur critique globale." }, { status: 500 });
  }
}