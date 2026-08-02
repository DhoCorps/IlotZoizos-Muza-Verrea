// apps/hub-central/app/api/sujets/[sujetId]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { connectToDatabase } from '@ilot/infrastructure';
import { SujetOrchestrator } from '@ilot/shared-core/src/sync-engine/sujet.orchestrator';
import { SujetModel } from '@ilot/infrastructure/src/database/models/nosql/sujet.model';
import { authOptions } from "../../../../lib/auth";
import { ActionSignature, CAPABILITIES } from '@ilot/types';

// ==========================================
// GET : Ausculter une pensée spécifique
// ==========================================
export async function GET(req: Request, { params }: { params: { sujetId: string } }) {
  try {
    await connectToDatabase();
    
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;
    const sessionCaps = (session?.user as any)?.capabilities || [];

    const sujet = await SujetModel.findOne({ uid: params.sujetId }).lean();
    if (!sujet) return NextResponse.json({ error: "Ce sujet s'est volatilisé de la Silice." }, { status: 404 });

    // Règle de visibilité : Soit c'est publié, soit c'est à moi, soit j'ai l'aura globale
    const isPublic = sujet.status === 'PUBLISHED';
    const isMine = sujet.authorUid === userUid;
    const isArchitect = sessionCaps.includes('*');

    if (!isPublic && !isMine && !isArchitect) {
        return NextResponse.json({ error: "Ce monologue intime t'est fermé." }, { status: 403 });
    }

    // On renvoie les capacités de l'oiseau sur CET objet précis
    const myCaps = (isMine || isArchitect) ? [CAPABILITIES.SYSTEM.ALL] : [];

    return NextResponse.json({ ...sujet, myCapabilities: myCaps }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ==========================================
// PUT : Mutation du Sujet
// ==========================================
export async function PUT(req: Request, { params }: { params: { sujetId: string } }) {
  try {
    await connectToDatabase();
    
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;
    const sessionCaps = (session?.user as any)?.capabilities || [];

    if (!userUid) return NextResponse.json({ error: "Oiseau non identifié" }, { status: 401 });

    // La sécurité métier est gérée dans l'Orchestrateur (SujetOrchestrator.updateSujet)
    // On se contente de forger la signature
    const signature: ActionSignature = {
        actorUid: userUid,
        capabilities: sessionCaps
    };

    const body = await req.json();
    const sujetOrch = new SujetOrchestrator();
    const updatedSujet = await sujetOrch.updateSujet(params.sujetId, body, signature);

    return NextResponse.json(updatedSujet);
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

// ==========================================
// DELETE : Désintégration (Brûler le texte)
// ==========================================
export async function DELETE(req: Request, { params }: { params: { sujetId: string } }) {
  try {
    await connectToDatabase();
    
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;
    const sessionCaps = (session?.user as any)?.capabilities || [];

    if (!userUid) return NextResponse.json({ error: "Oiseau non identifié" }, { status: 401 });

    const signature: ActionSignature = {
        actorUid: userUid,
        capabilities: sessionCaps
    };

    const sujetOrch = new SujetOrchestrator();
    await sujetOrch.disintegrateSujet(params.sujetId, signature);
    
    return NextResponse.json({ message: "Le texte a été rendu à la poussière. Les échos dans le Graphe sont tranchés." }, { status: 200 });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}