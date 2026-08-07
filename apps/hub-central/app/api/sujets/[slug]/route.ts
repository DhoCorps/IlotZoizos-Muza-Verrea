import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectToDatabase, SujetModel } from '@ilot/infrastructure';
import { SujetOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { slugify } from '@/lib/slugify';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// ==========================================
// GET : Ausculter un sujet spécifique par slug ou uid
// ==========================================
export async function GET(req: Request, { params }: RouteParams) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR SUJET GET]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let rawSlug;
    try {
      const resolvedParams = await params;
      rawSlug = resolvedParams.slug;
    } catch (paramErr) {
      console.error("🔥 [PARAM ERROR SUJET GET]", paramErr);
      return NextResponse.json({ error: "Identifiant de sujet invalide." }, { status: 400 });
    }
    
    const slug = slugify(rawSlug || '');

    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR SUJET GET]", sessionErr);
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    const userUid = (session?.user as any)?.uid;
    const sessionCaps = (session?.user as any)?.capabilities || [];

    let sujet;
    try {
      sujet = await SujetModel.findOne({ 
        $or: [{ slug: slug }, { uid: slug }] 
      }).lean();
    } catch (queryErr) {
      console.error("🔥 [SUJET QUERY ERROR]", queryErr);
      return NextResponse.json({ error: "Échec de lecture du monologue." }, { status: 500 });
    }

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
    console.error("🔥 Erreur globale GET Sujet :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}

// ==========================================
// PUT : Mutation du Sujet
// ==========================================
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR SUJET PUT]", sessionErr);
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
      console.error("❌ [DB ERROR SUJET PUT]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let rawSlug;
    try {
      const resolvedParams = await params;
      rawSlug = resolvedParams.slug;
    } catch (paramErr) {
      console.error("🔥 [PARAM ERROR SUJET PUT]", paramErr);
      return NextResponse.json({ error: "Identifiant de sujet invalide." }, { status: 400 });
    }
    
    const slug = slugify(rawSlug || '');

    let sujet;
    try {
      sujet = await SujetModel.findOne({ 
        $or: [{ slug: slug }, { uid: slug }] 
      });
    } catch (queryErr) {
      console.error("🔥 [SUJET PUT QUERY ERROR]", queryErr);
      return NextResponse.json({ error: "Échec de recherche du sujet." }, { status: 500 });
    }

    if (!sujet) {
      return NextResponse.json({ error: "Sujet introuvable." }, { status: 404 });
    }

    const isAuthor = sujet.authorUid === userUid;
    const isArchitect = sessionCaps.includes('*');

    if (!isAuthor && !isArchitect) {
      return NextResponse.json({ error: "Tu ne peux modifier que tes propres monologues." }, { status: 403 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    let updatedSujet;
    try {
      updatedSujet = await SujetModel.findOneAndUpdate(
        { uid: sujet.uid },
        { $set: body },
        { new: true }
      ).lean();
    } catch (updateErr) {
      console.error("🔥 [SUJET UPDATE ERROR]", updateErr);
      return NextResponse.json({ error: "Échec de la mutation du sujet." }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: updatedSujet }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale PUT Sujet :", error);
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status });
  }
}

// ==========================================
// DELETE : Désintégration / Suppression du Sujet
// ==========================================
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR SUJET DELETE]", sessionErr);
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
      console.error("❌ [DB ERROR SUJET DELETE]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let rawSlug;
    try {
      const resolvedParams = await params;
      rawSlug = resolvedParams.slug;
    } catch (paramErr) {
      console.error("🔥 [PARAM ERROR SUJET DELETE]", paramErr);
      return NextResponse.json({ error: "Identifiant de sujet invalide." }, { status: 400 });
    }
    
    const slug = slugify(rawSlug || '');

    let sujet;
    try {
      sujet = await SujetModel.findOne({ 
        $or: [{ slug: slug }, { uid: slug }] 
      });
    } catch (queryErr) {
      console.error("🔥 [SUJET DELETE QUERY ERROR]", queryErr);
      return NextResponse.json({ error: "Échec de recherche du sujet." }, { status: 500 });
    }

    if (!sujet) {
      return NextResponse.json({ error: "Sujet introuvable." }, { status: 404 });
    }

    const signature: ActionSignature = {
      actorUid: userUid,
      capabilities: sessionCaps
    };

    try {
      const sujetOrch = new SujetOrchestrator();
      if (typeof sujetOrch.disintegrateSujet === 'function') {
        await sujetOrch.disintegrateSujet(sujet.uid, signature);
      } else {
        await SujetModel.deleteOne({ uid: sujet.uid });
      }
    } catch (orchErr: any) {
      console.error("🔥 [SUJET ORCHESTRATOR DISINTEGRATE ERROR]", orchErr);
      const status = orchErr.statusCode || 500;
      return NextResponse.json({ error: orchErr.message || "Échec de la désintégration du monologue." }, { status });
    }
    
    return NextResponse.json({ success: true, message: "Le monologue a été réduit en cendres. Les liens dans le Graphe sont rompus." }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale DELETE Sujet :", error);
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status });
  }
}