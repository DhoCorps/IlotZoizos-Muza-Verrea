import { NextResponse } from 'next/server';
import { connectToDatabase } from '@ilot/infrastructure';
import { KontaktOrchestrator } from '@ilot/shared-core';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR KONTAKT SWIPES]", sessionErr);
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    if (!session || !session.user) {
      return NextResponse.json({ error: "Oiseau non identifié. Swipe rejeté." }, { status: 401 });
    }

    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR KONTAKT SWIPES]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    const swiperUid = (session.user as any).uid;
    const { targetUid, action } = body; // action: 'LIKE' | 'PASS'

    if (!targetUid || !action) {
      return NextResponse.json({ error: "Paramètres de swipe incomplets." }, { status: 400 });
    }

    let result;
    try {
      const orchestrator = new KontaktOrchestrator();
      result = await orchestrator.registerSwipe(
        { swiperUid, targetUid, action },
        {
          actorUid: swiperUid,
          capabilities: (session.user as any).capabilities || []
        }
      );
    } catch (orchErr: any) {
      console.error("🔥 [KONTAKT ORCHESTRATOR SWIPE ERROR]", orchErr);
      const status = orchErr.statusCode || 400;
      return NextResponse.json({ error: orchErr.message || "Échec de l'enregistrement du swipe." }, { status });
    }

    return NextResponse.json({
      success: true,
      data: result
    }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Fracture lors de l'enregistrement du Swipe :", error);
    return NextResponse.json({ error: error.message || "Échec du swipe." }, { status: 500 });
  }
}