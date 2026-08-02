// apps/hub-central/app/api/kontakt/swipes/route.ts
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@ilot/infrastructure';
import { KontaktOrchestrator } from '@ilot/shared-core';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Oiseau non identifié. Swipe rejeté." }, { status: 401 });
    }

    await connectToDatabase();
    const body = await req.json();
    const swiperUid = (session.user as any).uid;
    const { targetUid, action } = body; // action: 'LIKE' | 'PASS'

    if (!targetUid || !action) {
      return NextResponse.json({ error: "Paramètres de swipe incomplets." }, { status: 400 });
    }

    const orchestrator = new KontaktOrchestrator();
    const result = await orchestrator.registerSwipe(
      { swiperUid, targetUid, action },
      {
        actorUid: swiperUid,
        capabilities: (session.user as any).capabilities || []
      }
    );

    return NextResponse.json({
      success: true,
      data: result
    }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Fracture lors de l'enregistrement du Swipe :", error);
    return NextResponse.json({ error: error.message || "Échec du swipe." }, { status: 500 });
  }
}