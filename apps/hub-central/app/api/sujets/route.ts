// apps/hub-central/app/api/sujets/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { connectToDatabase, getNeo4jSession } from '@ilot/infrastructure';
import { SujetOrchestrator } from '@ilot/shared-core/src/sync-engine/sujet.orchestrator';
import { SujetModel } from '@ilot/infrastructure/src/database/models/nosql/sujet.model';
import { ActionSignature, CAPABILITIES } from '@ilot/types';

// ==========================================
// GET : La Bibliothèque (Lister les sujets)
// ==========================================
export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;
    const sessionCaps = (session?.user as any)?.capabilities || [];

    const { searchParams } = new URL(req.url);
    const filterCategory = searchParams.get('category');
    
    let queryFilter: any = {
      $or: [
        { status: 'PUBLISHED' }, // Les monologues publiés (tom§hat§toes) sont visibles par tous
      ]
    };

    // Si on est connecté, on peut aussi voir ses propres brouillons
    if (userUid) {
      queryFilter.$or.push({ authorUid: userUid });
    }

    if (filterCategory) {
      queryFilter.category = filterCategory;
    }

    // Récupération depuis la Silice (MongoDB)
    const sujetsFromMongo = await SujetModel.find(queryFilter)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json(sujetsFromMongo);
  } catch (error: any) {
    console.error("🌊 Erreur dans la Bibliothèque (GET Sujets):", error);
    return NextResponse.json({ error: "L'écho de ces pensées s'est brisé." }, { status: 500 });
  }
}

// ==========================================
// POST : Fondation d'un Nœud de Pensée
// ==========================================
export async function POST(req: Request) {
  try {
    await connectToDatabase();
    
    // DOUANE
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;
    const sessionCaps = (session?.user as any)?.capabilities || [];

    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    const body = await req.json();

    if (!body.title || !body.content) {
      return NextResponse.json({ error: "Un Sujet nécessite un nom et une substance (contenu)." }, { status: 400 });
    }

    // CRÉATION DE LA PREUVE (Signature)
    const signature: ActionSignature = {
      actorUid: userUid,
      capabilities: sessionCaps
    };

    // L'Orchestrateur tisse les liens (Mongo + Neo4j)
    const sujetOrch = new SujetOrchestrator();
    
    // Forçage de l'authorUid (la sécurité avant tout, on ne fait pas confiance au body)
    const dataToForge = {
        ...body,
        authorUid: userUid
    };

    const result = await sujetOrch.fosterSujet(dataToForge, signature);
    
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    const status = error.statusCode || 500;
    console.error("🌋 [NEXUS] Erreur de Fondation (Sujet) :", error.message);
    return NextResponse.json({ error: error.message || "L'Îlot repousse ce fragment de pensée." }, { status });
  }
}