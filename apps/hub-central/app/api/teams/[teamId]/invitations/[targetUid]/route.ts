// apps/hub-central/app/api/teams/[teamId]/invitations/[targetUid]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { connectToDatabase } from '@ilot/infrastructure';
import { TeamModel } from '@ilot/infrastructure/src/database/models/nosql/team.model';
import { authOptions } from "../../../../../../lib/auth";
import { TransactionManager } from '@ilot/shared-core';

export async function DELETE(
  req: Request,
  { params }: { params: { teamId: string; targetUid: string } }
) {
  try {
    await connectToDatabase();

    // 1. Identification de l'oiseau à la gouvernance
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;
    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    // 2. Récupération du Nid dans la Silice pour vérifier les droits
    const team = await TeamModel.findOne({ uid: params.teamId });
    if (!team) {
      return NextResponse.json({ error: "Nid introuvable dans la Silice." }, { status: 404 });
    }

    // 🛡️ LE DOUBLE VERROU : Seul l'initiateur/Gardien du Nid ou un oiseau à l'Aura absolue (*) peut révoquer l'envol
    const isNestOwner = team.ownerUid === userUid;
    const isArchitect = (session?.user as any)?.capabilities?.includes('*') || false;

    if (!isNestOwner && !isArchitect) {
      return NextResponse.json({ 
        error: "Aura insuffisante pour révoquer une invitation sur ce territoire." 
      }, { status: 403 });
    }

    // 3. Exécution du tranchage au sein du gestionnaire de transaction unifié
    await TransactionManager.execute("Révocation d'Invitation", async (mongoSession, neo4jTx) => {
      const cypherRevoke = `
        MATCH (u:User {uid: $targetUid})-[r:INVITED_TO]->(t:Team {uid: $teamId})
        DELETE r
        RETURN 1
      `;
      
      const result = await neo4jTx.run(cypherRevoke, { 
        targetUid: params.targetUid, 
        teamId: params.teamId 
      });

      if (result.records.length === 0) {
        throw new Error("Aucune invitation active ou en attente trouvée pour cet oiseau.");
      }
      
      // 📝 LOG DE GOUVERNANCE (Optionnel mais recommandé pour ton mode "Souverain")
      console.log(`⚡ [Gouvernance] Invitation révoquée : Oiseau ${params.targetUid} retiré du Nid ${params.teamId} par ${userUid}`);
      
      return true;
    });

    return NextResponse.json({ 
      success: true, 
      message: "L'invitation a été révoquée et les fréquences ont été nettoyées." 
    }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Fracture lors de la révocation de l'invitation :", error);
    return NextResponse.json({ error: error.message || "L'action de gouvernance a échoué." }, { status: 500 });
  }
}