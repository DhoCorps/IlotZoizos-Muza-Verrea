import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Ajuste le chemin si besoin
import { connectToDatabase, PartitaModel } from '@ilot/infrastructure';
import { PartitaOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';

// ==========================================
// GET : Le Catalogue des Partitions
// ==========================================
export async function GET(req: Request) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR PARTITA GET]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR PARTITA GET]", sessionErr);
      return NextResponse.json({ error: "Échec de lecture de la session." }, { status: 500 });
    }

    const userUid = (session?.user as any)?.uid;

    let url;
    try {
      url = new URL(req.url);
    } catch (urlErr) {
      return NextResponse.json({ error: "URL de requête invalide." }, { status: 400 });
    }

    const filterInstrument = url.searchParams.get('instrument');
    const filterStatus = url.searchParams.get('status');
    
    let queryFilter: any = {
      $or: [
        { status: 'PUBLISHED' } // Les partitions publiées sont visibles par tous
      ]
    };

    // Si connecté, on peut voir ses propres brouillons
    if (userUid) {
      queryFilter.$or.push({ authorUid: userUid });
    }

    if (filterInstrument) queryFilter.instrument = filterInstrument;
    if (filterStatus) queryFilter.status = filterStatus;

    let partitionsFromMongo;
    try {
      partitionsFromMongo = await PartitaModel.find(queryFilter)
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
    } catch (queryErr) {
      console.error("🔥 [PARTITA QUERY ERROR]", queryErr);
      return NextResponse.json({ error: "L'écho de ces notes s'est brisé." }, { status: 500 });
    }

    return NextResponse.json(partitionsFromMongo, { status: 200 });

  } catch (error: any) {
    console.error("🌊 Erreur globale GET Partitions:", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}

// ==========================================
// POST : Fondation d'une Partition
// ==========================================
export async function POST(req: Request) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR PARTITA POST]", sessionErr);
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    const userUid = (session?.user as any)?.uid;
    const sessionCaps = (session?.user as any)?.capabilities || [];

    if (!userUid) {
      return NextResponse.json({ error: "Oiseau musicien non identifié." }, { status: 401 });
    }

    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR PARTITA POST]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    if (!body.title || !body.content) {
      return NextResponse.json({ error: "Une partition nécessite un titre et une substance (contenu)." }, { status: 400 });
    }

    const signature: ActionSignature = {
      actorUid: userUid,
      capabilities: sessionCaps
    };

    let result;
    try {
      const partitaOrch = new PartitaOrchestrator();
      const dataToForge = { ...body, authorUid: userUid };
      result = await partitaOrch.fosterPartita(dataToForge, signature);
    } catch (orchErr: any) {
      console.error("🌋 [PARTITA ORCHESTRATOR POST ERROR] :", orchErr);
      const status = orchErr.statusCode || 500;
      return NextResponse.json({ error: orchErr.message || "L'Îlot repousse cette partition." }, { status });
    }
    
    return NextResponse.json(result, { status: 201 });

  } catch (error: any) {
    console.error("🔥 Erreur globale POST Partitions :", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}