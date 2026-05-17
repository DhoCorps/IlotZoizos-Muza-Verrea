// apps/hub-central/app/api/teams/[teamId]/leave/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { connectToDatabase } from '@ilot/infrastructure';
import { authOptions } from "../../../../../lib/auth"; // 🪡 SUTURE : Alignement géométrique vers ta source unique
import { TeamOrchestrator } from '@ilot/shared-core/src/sync-engine/team.orchestrator';
import { ActionSignature } from '@ilot/types';

/**
 * 🚀 POST : L'envol volontaire d'un oiseau invité hors du Nid parent
 */
export async function POST(req: Request, { params }: { params: { teamId: string } }) {
  try {
    // 1. Réveil de la Silice
    await connectToDatabase();
    
    // 2. Vérification de l'Empreinte de Session
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;
    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié dans la canopée." }, { status: 401 });
    }

    // 3. Décodage du protocole mémoriel choisi
    const body = await req.json();
    const { mode } = body; // 'CLEAN' (Effacement des traces) ou 'TRACE' (Héritage)

    if (!mode || !['CLEAN', 'TRACE'].includes(mode)) {
      return NextResponse.json({ 
        error: "Veuillez choisir un protocole mémoriel valide ('CLEAN' ou 'TRACE')." 
      }, { status: 400 });
    }

    // 4. Forge de la Signature d'Action
    const signature: ActionSignature = {
      actorUid: userUid,
      capabilities: (session?.user as any)?.capabilities || []
    };

    // 5. Exécution du détachement au sein de l'Orchestrateur
    const orchestrator = new TeamOrchestrator();
    const result = await orchestrator.leaveTeam(params.teamId, userUid, mode, signature);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("🔥 Fracture lors de l'envol volontaire API (POST Leave Team):", error);
    return NextResponse.json(
      { error: error.message }, 
      { status: error.statusCode || 500 }
    );
  }
}