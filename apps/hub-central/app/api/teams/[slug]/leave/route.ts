import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { connectToDatabase } from '@ilot/infrastructure';
import { authOptions } from "@/lib/auth";
import { TeamOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { slugify } from '@/lib/slugify';

/**
 * 🌿 INTERFACE DES PARAMÈTRES DE ROUTE (Projeté avec [slug])
 */
interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * 🚀 POST : L'envol volontaire d'un oiseau invité hors du Nid parent
 */
export async function POST(req: Request, { params }: RouteParams) {
  try {
    // 1. Éveil de la Silice
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR TEAM LEAVE POST]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }
    
    // 2. Vérification de l'Empreinte de Session
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR TEAM LEAVE POST]", sessionErr);
      return NextResponse.json({ error: "Erreur de lecture d'Aura." }, { status: 500 });
    }

    const userUid = (session?.user as any)?.uid;
    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié dans la canopée." }, { status: 401 });
    }

    // 3. Résolution et slugification du paramètre dynamique
    let rawSlug;
    try {
      const resolvedParams = await params;
      rawSlug = resolvedParams.slug;
    } catch (paramErr) {
      return NextResponse.json({ error: "Identifiant de nid (slug) invalide." }, { status: 400 });
    }

    const teamIdentifier = slugify(rawSlug || '');

    // 4. Décodage du protocole mémoriel
    let body;
    try {
        body = await req.json();
    } catch (e) {
        return NextResponse.json({ error: "L'onde est muette : Corps de requête invalide ou manquant." }, { status: 400 });
    }

    const { mode } = body;

    if (!mode || !['CLEAN', 'TRACE'].includes(mode)) {
      return NextResponse.json({ 
        error: "Veuillez choisir un protocole mémoriel valide ('CLEAN' ou 'TRACE')." 
      }, { status: 400 });
    }

    // 5. Forge de la Signature d'Action
    const signature: ActionSignature = {
      actorUid: userUid,
      capabilities: (session?.user as any)?.capabilities || []
    };

    // 6. Exécution du détachement
    let result;
    try {
      const orchestrator = new TeamOrchestrator();
      result = await orchestrator.leaveTeam(teamIdentifier, userUid, mode, signature);
    } catch (orchErr: any) {
      console.error("🌋 [TEAM ORCHESTRATOR LEAVE ERROR]", orchErr);
      const status = orchErr.status || orchErr.statusCode || 500;
      return NextResponse.json({ error: orchErr.message || "Erreur interne lors de la séparation." }, { status });
    }
    
    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Fracture lors de l'envol volontaire API (POST Leave Team):", error);
    return NextResponse.json(
      { error: error.message || "Erreur interne lors de la séparation." }, 
      { status: error.statusCode || 500 }
    );
  }
}