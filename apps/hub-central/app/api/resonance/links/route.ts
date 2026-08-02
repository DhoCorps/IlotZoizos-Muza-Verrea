import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { connectToDatabase } from '@ilot/infrastructure';
import { ResonanceOrchestrator } from '@ilot/shared-core/src/sync-engine/resonance.orchestrator';
import { WeaveLinkSchema, ActionSignature } from '@ilot/types';

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;
    const sessionCaps = (session?.user as any)?.capabilities || [];

    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié. Le Graphe refuse le tissage aveugle." }, { status: 401 });
    }

    const body = await req.json();
    const validation = WeaveLinkSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Forme du pont invalide.", details: validation.error.flatten() }, { status: 400 });
    }

    const signature: ActionSignature = {
      actorUid: userUid,
      capabilities: sessionCaps
    };

    const orchestrator = new ResonanceOrchestrator();
    const result = await orchestrator.weaveCrossDomainLink(
      validation.data.sourceUid,
      validation.data.sourceLabel,
      validation.data.targetUid,
      validation.data.targetLabel,
      validation.data.relationType,
      signature
    );

    return NextResponse.json({
      success: true,
      message: `Pont transdisciplinaire [${validation.data.relationType}] forgé avec succès dans le Graphe !`,
      result
    }, { status: 201 });
  } catch (error: any) {
    console.error("🌋 Fracture lors du tissage global :", error);
    return NextResponse.json({ error: error.message || "La matrice a rejeté le lien." }, { status: error.statusCode || 500 });
  }
}