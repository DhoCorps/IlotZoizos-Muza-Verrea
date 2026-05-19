// apps/hub-central/app/api/teams/[teamId]/respond/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { TeamModel } from '@ilot/infrastructure/src/database/models/nosql/team.model';
import { OiseauModel } from '@ilot/infrastructure/src/database/models/nosql/user.model';
import { connectToDatabase, getNeo4jSession } from '@ilot/infrastructure'; // 🪡 SUTURE DE CONNEXION : Pool unifié
import { authOptions } from "../../../../../lib/auth"; // 🪡 SUTURE : Pointage direct vers ta source unique
import { TransactionManager } from '@ilot/shared-core/src/sync-engine/transactionManager';

/**
 * 🚀 POST : Signer ou rejeter le Pacte d'Adhésion (ACCEPT / REFUSE)
 */
export async function POST(req: Request, { params }: { params: { teamId: string } }) {
  try {
    await connectToDatabase();
    
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;
    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié dans la canopée." }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body; 

    if (!action || !['ACCEPT', 'REFUSE'].includes(action)) {
      return NextResponse.json({ error: "Mouvement invalide sur le Pacte." }, { status: 400 });
    }

    // 🕸️ VÉRIFICATION ORGANIQUE DANS LE GRAPHE (Singleton préservé)
    const neoSession = getNeo4jSession();
    let invitationCapabilities: string[] = [];
    try {
      const checkCypher = `
        MATCH (u:User {uid: $userUid})-[r:INVITED_TO]->(t:Team {uid: $teamId})
        RETURN r.capabilities AS caps
      `;
      const checkResult = await neoSession.run(checkCypher, { userUid, teamId: params.teamId });
      
      if (checkResult.records.length === 0) {
        return NextResponse.json({ 
          error: "Souveraineté violée : Aucune invitation en attente pour votre Empreinte dans ce Nid." 
        }, { status: 451 }); 
      }
      
      invitationCapabilities = checkResult.records[0].get('caps') || [];
    } finally {
      await neoSession.close();
    }

    const team = await TeamModel.findOne({ uid: params.teamId });
    if (!team) {
      return NextResponse.json({ error: "Ce Nid s'est volatilisé de la Silice." }, { status: 404 });
    }

    const syncResult = await TransactionManager.execute("Réponse au Pacte d'Adhésion", async (mongoSession, neo4jTx) => {
      if (action === 'ACCEPT') {
        const acceptCypher = `
          MATCH (u:User {uid: $userUid})-[r:INVITED_TO]->(t:Team {uid: $teamId})
          DELETE r
          MERGE (u)-[m:MEMBER_OF]->(t)
          SET m.since = datetime(), 
              m.capabilities = $caps
          RETURN t
        `;
        await neo4jTx.run(acceptCypher, { userUid, teamId: params.teamId, caps: invitationCapabilities });

        await OiseauModel.findOneAndUpdate(
          { uid: userUid },
          { $addToSet: { teams: team._id } }, 
          { session: mongoSession }
        );
      } else {
        // 🪡 SUTURE : Mutation du lien pour conserver la trace du refus sans briser la souveraineté de l'oiseau
        const refuseCypher = `
          MATCH (u:User {uid: $userUid})-[r:INVITED_TO]->(t:Team {uid: $teamId})
          DELETE r
          MERGE (u)-[m:REFUSED_INVITATION]->(t)
          SET m.refusedAt = datetime()
          RETURN 1
        `;
        await neo4jTx.run(refuseCypher, { userUid, teamId: params.teamId });
      }
      return true;
    });

    return NextResponse.json({ 
      success: true, 
      message: action === 'ACCEPT' 
        ? `Pacte signed with success. Bienvenue dans l'escouade "${team.name}".` 
        : `Invitation pour le Nid "${team.name}" déclinée avec souveraineté.`
    });

  } catch (error: any) {
    console.error("🔥 Fracture lors de la signature du pacte d'adhésion :", error);
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}