// apps/hub-central/app/api/teams/[teamId]/respond/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { connectToDatabase } from '@ilot/infrastructure';
import { TeamModel } from '@ilot/infrastructure/src/database/models/nosql/team.model';
import { OiseauModel } from '@ilot/infrastructure/src/database/models/nosql/user.model';
import { getNeo4jSession } from '@ilot/infrastructure/src/database/neo4j';
import { authOptions } from "../../../../../lib/auth"; // 🪡 SUTURE : Pointage direct vers ta source unique
import { TransactionManager } from '@ilot/shared-core/src/sync-engine/transactionManager';

/**
 * 🚀 POST : Signer ou rejeter le Pacte d'Adhésion (ACCEPT / REFUSE)
 */
export async function POST(req: Request, { params }: { params: { teamId: string } }) {
  try {
    // 1. Réveil de la Silice
    await connectToDatabase();
    
    // 2. Identification de l'Oiseau connecté
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;
    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié dans la canopée." }, { status: 401 });
    }

    // 3. Lecture du choix du pacte
    const body = await req.json();
    const { action } = body; // 'ACCEPT' ou 'REFUSE'

    if (!action || !['ACCEPT', 'REFUSE'].includes(action)) {
      return NextResponse.json({ error: "Mouvement invalide sur le Pacte." }, { status: 400 });
    }

    // 4. 🕸️ VÉRIFICATION ORGANIQUE DANS LE GRAPHE 
    // L'Oiseau a le droit d'agir SI ET SEULEMENT SI le lien INVITED_TO existe vers son UID
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
        }, { status: 451 }); // Rejet de conformité légale/organique
      }
      
      // On récupère les plumes (droits) qui lui avaient été promises lors de l'invitation
      invitationCapabilities = checkResult.records[0].get('caps') || [];
    } finally {
      await neoSession.close();
    }

    // 5. Recherche du Nid dans la Silice pour sceller le jalon physique
    const team = await TeamModel.findOne({ uid: params.teamId });
    if (!team) {
      return NextResponse.json({ error: "Ce Nid s'est volatilisé de la Silice." }, { status: 404 });
    }

    // 6. EXECUTION DU PACTE VIA LE TRANSACTION MANAGER ATOMIQUE
    const syncResult = await TransactionManager.execute("Réponse au Pacte d'Adhésion", async (mongoSession, neo4jTx) => {
      if (action === 'ACCEPT') {
        // 🕸️ NEO4J MUTATION : Transmutation du lien INVITED_TO en MEMBER_OF actif
        const acceptCypher = `
          MATCH (u:User {uid: $userUid})-[r:INVITED_TO]->(t:Team {uid: $teamId})
          DELETE r
          MERGE (u)-[m:MEMBER_OF]->(t)
          SET m.since = datetime(), 
              m.capabilities = $caps
          RETURN t
        `;
        await neo4jTx.run(acceptCypher, { userUid, teamId: params.teamId, caps: invitationCapabilities });

        // 🐘 MONGO SEDIMENTATION : Rattachement physique du Nid dans la fiche de l'Oiseau
        await OiseauModel.findOneAndUpdate(
          { uid: userUid },
          { $addToSet: { teams: team._id } }, // $addToSet évite les doublons accidentels
          { session: mongoSession }
        );
      } else {
        // 🕸️ NEO4J REVOCATION : Désintégration pure et simple du lien d'invitation
        const refuseCypher = `
          MATCH (u:User {uid: $userUid})-[r:INVITED_TO]->(t:Team {uid: $teamId})
          DELETE r
          RETURN 1
        `;
        await neo4jTx.run(refuseCypher, { userUid, teamId: params.teamId });
        
        // Mode REFUSE : Aucun sédiment en Silice, l'Oiseau reste libre.
      }
      return true;
    });

    return NextResponse.json({ 
      success: true, 
      message: action === 'ACCEPT' 
        ? `Pacte signé avec succès. Bienvenue dans l'escouade "${team.name}".` 
        : `Invitation pour le Nid "${team.name}" déclinée avec souveraineté.`
    });

  } catch (error: any) {
    console.error("🔥 Fracture lors de la signature du pacte d'adhésion :", error);
    return NextResponse.json(
      { error: error.message }, 
      { status: error.statusCode || 500 }
    );
  }
}