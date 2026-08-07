import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectToDatabase, SujetModel } from '@ilot/infrastructure';
import { SujetOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';

// ==========================================
// GET : La Bibliothèque (Lister les sujets)
// ==========================================
export async function GET(req: Request) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR SUJETS GET]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR SUJETS GET]", sessionErr);
      return NextResponse.json({ error: "Erreur de lecture d'Aura." }, { status: 500 });
    }

    const userUid = (session?.user as any)?.uid;

    let url;
    try {
      url = new URL(req.url);
    } catch (err) {
      return NextResponse.json({ error: "URL de requête invalide." }, { status: 400 });
    }

    const filterCategory = url.searchParams.get('category');
    
    let queryFilter: any = {
      $or: [ { status: 'PUBLISHED' } ]
    };

    if (userUid) {
      queryFilter.$or.push({ authorUid: userUid });
    }

    if (filterCategory) {
      queryFilter.category = filterCategory;
    }

    let sujetsFromMongo;
    try {
      sujetsFromMongo = await SujetModel.find(queryFilter)
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
    } catch (queryErr) {
      console.error("🔥 [SUJETS QUERY ERROR]", queryErr);
      return NextResponse.json({ error: "L'écho de ces pensées s'est brisé." }, { status: 500 });
    }

    return NextResponse.json(sujetsFromMongo, { status: 200 });

  } catch (error: any) {
    console.error("🌊 Erreur globale dans la Bibliothèque (GET Sujets):", error);
    return NextResponse.json({ error: "Erreur interne globale." }, { status: 500 });
  }
}

// ==========================================
// POST : Fondation d'un Nœud de Pensée
// ==========================================
export async function POST(req: Request) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR SUJETS POST]", sessionErr);
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    const userUid = (session?.user as any)?.uid;
    const sessionCaps = (session?.user as any)?.capabilities || [];

    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR SUJETS POST]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    if (!body.title || !body.content) {
      return NextResponse.json({ error: "Un Sujet nécessite un nom et une substance (contenu)." }, { status: 400 });
    }

    const signature: ActionSignature = {
      actorUid: userUid,
      capabilities: sessionCaps
    };

    let result;
    try {
      const sujetOrch = new SujetOrchestrator();
      const dataToForge = { ...body, authorUid: userUid };
      result = await sujetOrch.fosterSujet(dataToForge, signature);
    } catch (orchErr: any) {
      console.error("🌋 [NEXUS SUJET ORCHESTRATOR ERROR] :", orchErr);
      const status = orchErr.statusCode || 500;
      return NextResponse.json({ error: orchErr.message || "L'Îlot repousse ce fragment de pensée." }, { status });
    }
    
    return NextResponse.json(result, { status: 201 });

  } catch (error: any) {
    console.error("🔥 Erreur globale POST Sujet :", error);
    return NextResponse.json({ error: "Erreur interne globale." }, { status: 500 });
  }
}