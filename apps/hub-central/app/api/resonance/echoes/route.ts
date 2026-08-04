// apps/hub-central/app/api/resonance/echoes/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { connectToDatabase } from '@ilot/infrastructure';
import { ResonanceOrchestrator } from '@ilot/shared-core';
import { ResonanceModel } from '@ilot/infrastructure';
import { EchoSchema, ActionSignature } from '@ilot/types';

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const targetUid = searchParams.get('targetUid');

    if (!targetUid) {
      return NextResponse.json({ error: "Cible de résonance manquante." }, { status: 400 });
    }

    const echoes = await ResonanceModel.find({ targetUid })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json(echoes, { status: 200 });
  } catch (error: any) {
    console.error("🌊 Erreur lors de la lecture des échos :", error);
    return NextResponse.json({ error: "Impossible de capter les résonances." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;
    const sessionCaps = (session?.user as any)?.capabilities || [];

    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié dans la canopée." }, { status: 401 });
    }

    const body = await req.json();
    const validation = EchoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Écho malformé.", details: validation.error.flatten() }, { status: 400 });
    }

    const signature: ActionSignature = {
      actorUid: userUid,
      capabilities: sessionCaps
    };

    const orchestrator = new ResonanceOrchestrator();
    
    // 1. Inscription dans le Graphe Neo4j
    const resonanceResult = await orchestrator.addSocialEcho(
      validation.data.targetUid,
      validation.data.targetLabel,
      validation.data.echoType,
      validation.data.content,
      signature
    );

    // 2. Sédimentation pérenne dans la Silice MongoDB pour les échos textuels
    let savedEcho = null;
    if (validation.data.echoType === 'TEXT') {
      [savedEcho] = await ResonanceModel.create([{
        uid: resonanceResult.echoUid,
        targetUid: validation.data.targetUid,
        targetLabel: validation.data.targetLabel,
        actorUid: userUid,
        echoType: validation.data.echoType,
        content: validation.data.content
      }]);
    }

    return NextResponse.json({
      success: true,
      message: "L'écho s'est propagé à travers toute l'Îlot.",
      echo: savedEcho || resonanceResult
    }, { status: 201 });
  } catch (error: any) {
    console.error("🌋 Fracture lors de la sédimentation de l'écho :", error);
    return NextResponse.json({ error: error.message || "La tempête a étouffé le murmure." }, { status: 500 });
  }
}