import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { connectToDatabase, SujetModel } from '@ilot/infrastructure';
import { SujetOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// ==========================================
// GET : Ausculter un sujet spécifique par slug ou uid
// ==========================================
export async function GET(req: Request, { params }: RouteParams) {
  try {
    await connectToDatabase();
    const { slug } = await params;
    
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;
    const sessionCaps = (session?.user as any)?.capabilities || [];

    // 🪡 Recherche par slug ou repli sur l'ancien uid pour compatibilité
    const sujet = await SujetModel.findOne({ 
      $or: [{ slug: slug }, { uid: slug }] 
    }).lean();

    if (!sujet) {
      return NextResponse.json({ error: "Ce monologue s'est évaporé dans la brume." }, { status: 404 });
    }

    const isPublic = sujet.status === 'PUBLISHED';
    const isMine = sujet.authorUid === userUid;
    const isArchitect = sessionCaps.includes('*');

    if (!isPublic && !isMine && !isArchitect) {
      return NextResponse.json({ error: "Ce monologue intime t'est fermé." }, { status: 403 });
    }

    return NextResponse.json(sujet, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Erreur GET Sujet :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ==========================================
// PUT : Mutation du Sujet
// ==========================================
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    await connectToDatabase();
    const { slug } = await params;
    
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;
    const sessionCaps = (session?.user as any)?.capabilities || [];

    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    const sujet = await SujetModel.findOne({ 
      $or: [{ slug: slug }, { uid: slug }] 
    });

    if (!sujet) {
      return NextResponse.json({ error: "Sujet introuvable." }, { status: 404 });
    }

    const isAuthor = sujet.authorUid === userUid;
    const isArchitect = sessionCaps.includes('*');

    if (!isAuthor && !isArchitect) {
      return NextResponse.json({ error: "Tu ne peux modifier que tes propres monologues." }, { status: 403 });
    }

    const body = await req.json();

    const updatedSujet = await SujetModel.findOneAndUpdate(
      { uid: sujet.uid },
      { $set: body },
      { new: true }
    ).lean();

    return NextResponse.json({ success: true, data: updatedSujet }, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Erreur PUT Sujet :", error);
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

// ==========================================
// DELETE : Désintégration / Suppression du Sujet
// ==========================================
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    await connectToDatabase();
    const { slug } = await params;
    
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;
    const sessionCaps = (session?.user as any)?.capabilities || [];

    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    const sujet = await SujetModel.findOne({ 
      $or: [{ slug: slug }, { uid: slug }] 
    });

    if (!sujet) {
      return NextResponse.json({ error: "Sujet introuvable." }, { status: 404 });
    }

    const signature: ActionSignature = {
      actorUid: userUid,
      capabilities: sessionCaps
    };

    const sujetOrch = new SujetOrchestrator();
    
    // Si l'orchestrateur gère la désintégration globale (Mongo + Neo4j)
    if (typeof sujetOrch.disintegrateSujet === 'function') {
      await sujetOrch.disintegrateSujet(sujet.uid, signature);
    } else {
      await SujetModel.deleteOne({ uid: sujet.uid });
    }
    
    return NextResponse.json({ success: true, message: "Le monologue a été réduit en cendres. Les liens dans le Graphe sont rompus." }, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Erreur DELETE Sujet :", error);
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}