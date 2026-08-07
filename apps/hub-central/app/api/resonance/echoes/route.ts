// apps/hub-central/app/api/resonance/echoes/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectToDatabase, ResonanceModel } from '@ilot/infrastructure';
import { ResonanceOrchestrator } from '@ilot/shared-core';
import { EchoSchema, ActionSignature, EntityLabel } from '@ilot/types';

// ==========================================
// GET : Écouter les résonances (Échos)
// ==========================================
export async function GET(req: Request) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR RESONANCE ECHOES GET]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let url;
    try {
      url = new URL(req.url);
    } catch (err) {
      return NextResponse.json({ error: "URL de requête invalide." }, { status: 400 });
    }

    const targetUid = url.searchParams.get('targetUid');
    if (!targetUid) {
      return NextResponse.json({ error: "Cible de résonance manquante." }, { status: 400 });
    }

    let echoes;
    try {
      echoes = await ResonanceModel.find({ targetUid })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
    } catch (queryErr) {
      console.error("🔥 [RESONANCE ECHOES QUERY ERROR]", queryErr);
      return NextResponse.json({ error: "Impossible de capter les résonances dans la Silice." }, { status: 500 });
    }

    return NextResponse.json(echoes, { status: 200 });

  } catch (error: any) {
    console.error("🌊 Erreur globale lors de la lecture des échos :", error);
    return NextResponse.json({ error: "La tempête a brouillé l'écoute." }, { status: 500 });
  }
}

// ==========================================
// POST : Propager un Écho
// ==========================================
export async function POST(req: Request) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR RESONANCE ECHOES POST]", sessionErr);
      return NextResponse.json({ error: "Erreur de lecture d'Aura (session)." }, { status: 500 });
    }

    const userUid = (session?.user as any)?.uid;
    const sessionCaps = (session?.user as any)?.capabilities || [];

    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié dans la canopée." }, { status: 401 });
    }

    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR RESONANCE ECHOES POST]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let rawBody;
    try {
      rawBody = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "Le chant (requête) est illisible." }, { status: 400 });
    }

    const validation = EchoSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Écho malformé.", details: validation.error.flatten() }, 
        { status: 400 }
      );
    }

    const signature: ActionSignature = {
      actorUid: userUid,
      capabilities: sessionCaps
    };

    let resonanceResult;
    try {
      // 🕸️ 1. Inscription dans le Graphe Neo4j (via la méthode statique)
      resonanceResult = await ResonanceOrchestrator.addSocialEcho(
        validation.data.targetUid,
        validation.data.targetLabel as EntityLabel,
        validation.data.echoType,
        validation.data.content,
        signature
      );
    } catch (neoErr: any) {
      console.error("🌋 [NEO4J ECHO FORGE ERROR] :", neoErr);
      const status = neoErr.statusCode || 500;
      return NextResponse.json({ error: neoErr.message || "Le Graphe a rejeté l'écho." }, { status });
    }

    // 2. Sédimentation pérenne dans la Silice MongoDB pour les échos textuels
    let savedEcho = null;
    if (validation.data.echoType === 'TEXT') {
      try {
        const createResult = await ResonanceModel.create([{
          uid: resonanceResult.echoUid,
          targetUid: validation.data.targetUid,
          targetLabel: validation.data.targetLabel,
          actorUid: userUid,
          echoType: validation.data.echoType,
          content: validation.data.content
        }]);
        savedEcho = createResult[0];
      } catch (mongoErr) {
        console.error("🔥 [MONGO ECHO SEDIMENTATION ERROR] :", mongoErr);
        // On ne bloque pas si le Graphe a réussi, mais on notifie
        return NextResponse.json({ 
          success: true, 
          warning: "Écho inscrit dans le Graphe, mais la Silice n'a pas pu le retenir.",
          echo: resonanceResult 
        }, { status: 201 });
      }
    }

    return NextResponse.json({
      success: true,
      message: "L'écho s'est propagé à travers toute l'Îlot.",
      echo: savedEcho || resonanceResult
    }, { status: 201 });

  } catch (error: any) {
    console.error("🌋 Fracture globale lors de la sédimentation de l'écho :", error);
    return NextResponse.json({ error: "La tempête a étouffé le murmure." }, { status: 500 });
  }
}