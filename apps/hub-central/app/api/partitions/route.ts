import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { connectToDatabase } from '@ilot/infrastructure';
import { PartitaOrchestrator } from '@ilot/shared-core';
import { PartitaModel } from '@ilot/infrastructure';
import { ActionSignature } from '@ilot/types';

// ==========================================
// GET : Le Catalogue des Partitions
// ==========================================
export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;

    const { searchParams } = new URL(req.url);
    const filterInstrument = searchParams.get('instrument');
    const filterStatus = searchParams.get('status');
    
    let queryFilter: any = {
      $or: [
        { status: 'PUBLISHED' }, // Les partitions publiées sont visibles par tous
      ]
    };

    // Si connecté, on peut voir ses propres brouillons
    if (userUid) {
      queryFilter.$or.push({ authorUid: userUid });
    }

    if (filterInstrument) {
      queryFilter.instrument = filterInstrument;
    }

    if (filterStatus) {
      queryFilter.status = filterStatus;
    }

    const partitionsFromMongo = await PartitaModel.find(queryFilter)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json(partitionsFromMongo);
  } catch (error: any) {
    console.error("🌊 Erreur dans le Catalogue (GET Partitions):", error);
    return NextResponse.json({ error: "L'écho de ces notes s'est brisé." }, { status: 500 });
  }
}

// ==========================================
// POST : Fondation d'une Partition
// ==========================================
export async function POST(req: Request) {
  try {
    await connectToDatabase();
    
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;
    const sessionCaps = (session?.user as any)?.capabilities || [];

    if (!userUid) {
      return NextResponse.json({ error: "Oiseau musicien non identifié." }, { status: 401 });
    }

    const body = await req.json();

    if (!body.title || !body.content) {
      return NextResponse.json({ error: "Une partition nécessite un titre et une substance (contenu / notes)." }, { status: 400 });
    }

    const signature: ActionSignature = {
      actorUid: userUid,
      capabilities: sessionCaps
    };

    const partitaOrch = new PartitaOrchestrator();
    
    const dataToForge = {
        ...body,
        authorUid: userUid
    };

    const result = await partitaOrch.fosterPartita(dataToForge, signature);
    
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    const status = error.statusCode || 500;
    console.error("🌋 [PARTITA] Erreur de Fondation :", error.message);
    return NextResponse.json({ error: error.message || "L'Îlot repousse cette partition." }, { status });
  }
}