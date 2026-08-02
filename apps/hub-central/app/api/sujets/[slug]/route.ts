import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { connectToDatabase } from '@ilot/infrastructure';
import { SujetOrchestrator } from '@ilot/shared-core';
import { SujetModel } from '@ilot/infrastructure';
import { ActionSignature } from '@ilot/types';
import { slugify } from '../../../../lib/slugify';

// ==========================================
// GET : La Bibliothèque (Lister les sujets)
// ==========================================
export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;

    const { searchParams } = new URL(req.url);
    const filterCategory = searchParams.get('category');
    
    let queryFilter: any = {
      $or: [
        { status: 'PUBLISHED' }, // Les monologues publiés sont visibles par tous
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

    // 1. GÉNÉRATION DU SLUG UNIQUE
    let baseSlug = slugify(body.title);
    let finalSlug = baseSlug;
    
    let slugExists = await SujetModel.findOne({ slug: finalSlug });
    let counter = 1;
    
    while (slugExists) {
      finalSlug = `${baseSlug}-${counter}`;
      slugExists = await SujetModel.findOne({ slug: finalSlug });
      counter++;
    }

    // CRÉATION DE LA PREUVE (Signature)
    const signature: ActionSignature = {
      actorUid: userUid,
      capabilities: sessionCaps
    };

    // L'Orchestrateur tisse les liens (Mongo + Neo4j)
    const sujetOrch = new SujetOrchestrator();
    
    // Forçage de l'authorUid ET du slug (la sécurité avant tout)
    const dataToForge = {
        ...body,
        authorUid: userUid,
        slug: finalSlug
    };

    const result = await sujetOrch.fosterSujet(dataToForge, signature);
    
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    const status = error.statusCode || 500;
    console.error("🌋 [NEXUS] Erreur de Fondation (Sujet) :", error.message);
    return NextResponse.json({ error: error.message || "L'Îlot repousse ce fragment de pensée." }, { status });
  }
}

// ==========================================
// DELETE : Désintégration d'un Monologue
// ==========================================
export async function DELETE(req: Request) {
  try {
    await connectToDatabase();
    
    // DOUANE
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;
    const sessionCaps = (session?.user as any)?.capabilities || [];

    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    // Récupération de l'identifiant (slug ou uid) via les query params ou le body
    const { searchParams } = new URL(req.url);
    let targetIdentifier = searchParams.get('slug') || searchParams.get('uid');

    if (!targetIdentifier) {
      try {
        const body = await req.json();
        targetIdentifier = body.slug || body.uid;
      } catch {}
    }

    if (!targetIdentifier) {
      return NextResponse.json({ error: "Le slug ou l'UID du sujet est requis pour la désintégration." }, { status: 400 });
    }

    const sujet = await SujetModel.findOne({ 
      $or: [{ slug: targetIdentifier }, { uid: targetIdentifier }] 
    });

    if (!sujet) {
      return NextResponse.json({ error: "Sujet introuvable dans la Silice." }, { status: 404 });
    }

    const isAuthor = sujet.authorUid === userUid;
    const isArchitect = sessionCaps.includes('*');

    if (!isAuthor && !isArchitect) {
      return NextResponse.json({ error: "Tu ne peux supprimer que tes propres monologues." }, { status: 403 });
    }

    const signature: ActionSignature = {
      actorUid: userUid,
      capabilities: sessionCaps
    };

    const sujetOrch = new SujetOrchestrator();
    
    if (typeof (sujetOrch as any).disintegrateSujet === 'function') {
      await (sujetOrch as any).disintegrateSujet(sujet.uid, signature);
    } else {
      await SujetModel.deleteOne({ uid: sujet.uid });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Le monologue a été réduit en cendres. Les liens dans le Graphe sont rompus." 
    }, { status: 200 });

  } catch (error: any) {
    const status = error.statusCode || 500;
    console.error("🌋 [NEXUS] Erreur de Désintégration (Sujet) :", error.message);
    return NextResponse.json({ error: error.message || "L'Îlot refuse la désintégration de ce fragment." }, { status });
  }
}