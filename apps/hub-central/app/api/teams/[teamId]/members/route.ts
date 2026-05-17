// apps/hub-central/app/api/teams/[teamId]/members/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { TeamOrchestrator } from "@ilot/shared-core/src/sync-engine/team.orchestrator";
import { ActionSignature } from "@ilot/types";
import { authOptions } from "../../../../../lib/auth"; 
import { connectToDatabase } from '@ilot/infrastructure';

/**
 * 🚀 POST : Gestion des membres et recrutement au sein du Nid
 */
export async function POST(req: Request, { params }: { params: { teamId: string } }) {
  try {
    await connectToDatabase();

    // 1. Identification de l'Oiseau connecté
    const session = await getServerSession(authOptions);
    const actorUid = (session?.user as any)?.uid;
    if (!actorUid) {
      return NextResponse.json({ error: "Oiseau non identifié dans la canopée." }, { status: 401 });
    }

    // 2. Décodage du mouvement
    const body = await req.json();
    const { userUid, action, capabilities } = body;

    if (action !== 'INVITE') {
      return NextResponse.json({ error: "Mouvement inconnu sur cette frontière." }, { status: 400 });
    }

    if (!userUid) {
      return NextResponse.json({ error: "L'UID de l'oiseau cible est manquant." }, { status: 400 });
    }

    // 3. Fabrication de la Preuve d'Aura (Signature)
    const signature: ActionSignature = {
      actorUid: actorUid,
      capabilities: (session?.user as any)?.capabilities || []
    };

    // 4. 🪡 SUTURE DES CLÉS : Traduction de 'userUid' (Front) vers 'targetUserUid' (Orchestrateur)
    const orchestrator = new TeamOrchestrator();
    const result = await orchestrator.inviteBird({
      teamUid: params.teamId,
      targetUserUid: userUid, // Alignement géométrique parfait
      capabilities
    }, signature);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Fracture lors du recrutement API (POST Members):", error);
    return NextResponse.json(
      { error: error.message }, 
      { status: error.statusCode || 500 }
    );
  }
}