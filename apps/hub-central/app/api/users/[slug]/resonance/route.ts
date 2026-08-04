// apps/hub-central/app/api/users/[userId]/resonance/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { connectToDatabase } from '@ilot/infrastructure';
import { TaskResonanceOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';

export async function POST(req: Request, { params }: { params: { userId: string } }) {
  try {
    await connectToDatabase();
    
    const session = await getServerSession(authOptions);
    const actorUid = (session?.user as any)?.uid;
    const capabilities = (session?.user as any)?.capabilities || [];

    if (!actorUid) {
      return NextResponse.json({ error: "Oiseau non identifié dans la canopée." }, { status: 401 });
    }

    const signature: ActionSignature = { actorUid, capabilities };
    const orchestrator = new TaskResonanceOrchestrator();
    const result = await orchestrator.processUserTaskResonance(params.userId, signature);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Fracture lors du calcul de résonance des tâches :", error);
    return NextResponse.json(
      { error: error.message || "Erreur interne de résonance." }, 
      { status: error.status || 500 }
    );
  }
}