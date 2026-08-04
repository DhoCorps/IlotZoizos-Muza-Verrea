// apps/hub-central/app/api/tasks/[slug]/irrigate/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { connectToDatabase } from '@ilot/infrastructure';
import { TaskIrrigationOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  try {
    await connectToDatabase();
    
    const session = await getServerSession(authOptions);
    const actorUid = (session?.user as any)?.uid;
    const capabilities = (session?.user as any)?.capabilities || [];

    if (!actorUid) {
      return NextResponse.json({ error: "Oiseau non identifié dans la canopée." }, { status: 401 });
    }

    const signature: ActionSignature = { actorUid, capabilities };
    const orchestrator = new TaskIrrigationOrchestrator();
    const result = await orchestrator.processTaskIrrigation(params.slug, signature);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Fracture lors de l'irrigation de la tâche :", error);
    return NextResponse.json(
      { error: error.message || "Erreur interne de la sève." }, 
      { status: error.status || 500 }
    );
  }
}