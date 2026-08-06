import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { TeamOrchestrator } from "@ilot/shared-core";
import { ActionSignature } from "@ilot/types";
import { authOptions } from "../../../../../lib/auth"; 
import { connectToDatabase } from '@ilot/infrastructure';

/**
 * 🌿 INTERFACE DES PARAMÈTRES DE ROUTE ([slug])
 * Conforme à l'exigence asynchrone de Next.js 15+ pour les segments dynamiques.
 */
interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * 🚀 POST : Gestion des membres et recrutement au sein du Nid
 */
export async function POST(req: Request, { params }: RouteParams) {
  try {
    // -------------------------------------------------------------------------
    // 1. ÉVEIL DE LA SILICE
    // -------------------------------------------------------------------------
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR TEAM MEMBERS POST]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    // -------------------------------------------------------------------------
    // 2. IDENTIFICATION DE L'OISEAU CONNECTÉ (SESSION)
    // -------------------------------------------------------------------------
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR TEAM MEMBERS POST]", sessionErr);
      return NextResponse.json({ error: "Erreur de lecture d'Aura." }, { status: 500 });
    }

    const actorUid = (session?.user as any)?.uid;
    if (!actorUid) {
      return NextResponse.json({ error: "Oiseau non identifié dans la canopée." }, { status: 401 });
    }

    // -------------------------------------------------------------------------
    // 3. RÉSOLUTION DES PARAMÈTRES DYNAMIQUES DE L'URL ([slug])
    // -------------------------------------------------------------------------
    let resolvedParams;
    try {
      resolvedParams = await params;
    } catch (paramErr) {
      console.error("🔥 [PARAM ERROR TEAM MEMBERS POST]", paramErr);
      return NextResponse.json({ error: "Identifiant de nid invalide." }, { status: 400 });
    }

    const teamIdentifier = resolvedParams.slug;

    // -------------------------------------------------------------------------
    // 4. DÉCODAGE SÉCURISÉ DU MOUVEMENT (CORPS DE REQUÊTE JSON)
    // -------------------------------------------------------------------------
    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "L'onde est muette : Corps de requête invalide ou manquant." }, { status: 400 });
    }

    const { userUid, action, capabilities } = body;

    if (!action || action !== 'INVITE') {
      return NextResponse.json({ error: "Mouvement inconnu sur cette frontière." }, { status: 400 });
    }

    if (!userUid) {
      return NextResponse.json({ error: "L'UID de l'oiseau cible est manquant." }, { status: 400 });
    }

    // -------------------------------------------------------------------------
    // 5. FABRICATION DE LA PREUVE D'AURA (SIGNATURE)
    // -------------------------------------------------------------------------
    const signature: ActionSignature = {
      actorUid: actorUid,
      capabilities: (session?.user as any)?.capabilities || []
    };

    // -------------------------------------------------------------------------
    // 6. EXÉCUTION DU RECRUTEMENT VIA L'ORCHESTRATEUR
    // -------------------------------------------------------------------------
    let result;
    try {
      const orchestrator = new TeamOrchestrator();
      result = await orchestrator.inviteBird({
        teamUid: teamIdentifier,
        targetUserUid: userUid, // Alignement géométrique parfait
        capabilities: capabilities || []
      }, signature);
    } catch (orchErr: any) {
      console.error("🌋 [TEAM ORCHESTRATOR INVITE ERROR]", orchErr);
      const status = orchErr.statusCode || orchErr.status || 500;
      return NextResponse.json({ error: orchErr.message || "Échec du rituel d'invitation." }, { status });
    }

    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Fracture globale lors du recrutement API (POST Members):", error);
    const status = error.statusCode || error.status || 500;
    return NextResponse.json(
      { error: error.message || "Erreur interne lors du recrutement." }, 
      { status }
    );
  }
}