import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { TeamModel, OiseauModel, ProjectModel, TaskModel, connectToDatabase, getNeo4jSession } from '@ilot/infrastructure'; 
import { authOptions } from "../../../../../lib/auth"; 
import { TransactionManager } from '@ilot/shared-core';

/**
 * 🌿 INTERFACE DES PARAMÈTRES DE ROUTE ([slug])
 * Conforme à l'exigence asynchrone de Next.js 15+ pour les segments dynamiques.
 */
interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    // -------------------------------------------------------------------------
    // 1. ÉVEIL DE LA SILICE
    // -------------------------------------------------------------------------
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR TEAM RESPOND POST]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }
    
    // -------------------------------------------------------------------------
    // 2. VÉRIFICATION DE L'EMPREINTE DE SESSION (DOUANE)
    // -------------------------------------------------------------------------
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR TEAM RESPOND POST]", sessionErr);
      return NextResponse.json({ error: "Erreur de lecture d'Aura." }, { status: 500 });
    }

    const userUid = (session?.user as any)?.uid;
    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié dans la canopée." }, { status: 401 });
    }

    // -------------------------------------------------------------------------
    // 3. RÉSOLUTION DES PARAMÈTRES DYNAMIQUES DE L'URL ([slug])
    // -------------------------------------------------------------------------
    let resolvedParams;
    try {
      resolvedParams = await params;
    } catch (paramErr) {
      return NextResponse.json({ error: "Identifiant de nid (slug) invalide." }, { status: 400 });
    }

    const teamIdentifier = resolvedParams.slug;

    // -------------------------------------------------------------------------
    // 4. DÉCODAGE SÉCURISÉ DU CORPS DE REQUÊTE (JSON)
    // -------------------------------------------------------------------------
    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "L'onde est muette : Corps de requête invalide ou manquant." }, { status: 400 });
    }

    const { action } = body; 

    if (!action || !['ACCEPT', 'REFUSE', 'PURGE_REFUSE'].includes(action)) {
      return NextResponse.json({ error: "Mouvement invalide sur le Pacte." }, { status: 400 });
    }

    // -------------------------------------------------------------------------
    // 5. RÉCUPÉRATION DU NID DANS LA SILICE (Supporte slug ou uid)
    // -------------------------------------------------------------------------
    let team;
    try {
      team = await TeamModel.findOne({ 
        $or: [{ slug: teamIdentifier }, { uid: teamIdentifier }] 
      }).lean();
    } catch (queryErr) {
      console.error("🔥 [TEAM QUERY ERROR]", queryErr);
      return NextResponse.json({ error: "Échec de lecture du Nid." }, { status: 500 });
    }

    if (!team) {
      return NextResponse.json({ error: "Ce Nid s'est volatilisé de la Silice." }, { status: 404 });
    }

    const teamUid = (team as any).uid;

    // -------------------------------------------------------------------------
    // 6. VALIDATION DE L'INVITATION DANS LE GRAPHE NEO4J
    // -------------------------------------------------------------------------
    const neoSession = getNeo4jSession();
    let invitationCapabilities: string[] = [];
    try {
      const checkCypher = `
        MATCH (u:User {uid: $userUid})-[r:INVITED_TO]->(t:Team {uid: $teamUid})
        RETURN r.capabilities AS caps
      `;
      const checkResult = await neoSession.run(checkCypher, { userUid, teamUid });
      
      if (checkResult.records.length === 0) {
        return NextResponse.json({ 
          error: "Souveraineté violée : Aucune invitation en attente pour ce Nid." 
        }, { status: 451 }); 
      }
      
      invitationCapabilities = checkResult.records[0].get('caps') || [];
    } catch (neoCheckErr) {
      console.error("🔥 [NEO4J INVITATION CHECK ERROR]", neoCheckErr);
      return NextResponse.json({ error: "Échec de vérification du pacte dans le Graphe." }, { status: 500 });
    } finally {
      if (neoSession) {
        try {
          await neoSession.close();
        } catch (closeErr) {
          console.error("⚠️ Erreur fermeture session Neo4j :", closeErr);
        }
      }
    }

    // -------------------------------------------------------------------------
    // 7. EXÉCUTION TRANSATIONNELLE DE LA RÉPONSE AU PACTE
    // -------------------------------------------------------------------------
    try {
      await TransactionManager.execute("Réponse au Pacte d'Adhésion", async (mongoSession, neo4jTx) => {
        if (action === 'ACCEPT') {
          const acceptCypher = `
            MATCH (u:User {uid: $userUid})-[r:INVITED_TO]->(t:Team {uid: $teamUid})
            DELETE r
            MERGE (u)-[m:MEMBER_OF]->(t)
            SET m.since = datetime(), 
                m.capabilities = $caps
            RETURN t
          `;
          await neo4jTx.run(acceptCypher, { userUid, teamUid, caps: invitationCapabilities });

          await OiseauModel.findOneAndUpdate(
            { uid: userUid },
            { $addToSet: { teams: (team as any)._id } }, 
            { session: mongoSession }
          );
        } else if (action === 'PURGE_REFUSE') {
          // 🪡 SUTURE MAJEURE : Purge souveraine avant refus
          const projects = await ProjectModel.find({ ownerUid: teamUid }).session(mongoSession).lean();
          const projectUids = projects.map(p => p.uid);

          if (projectUids.length > 0) {
            await TaskModel.deleteMany({ projectUid: { $in: projectUids }, creatorUid: userUid }, { session: mongoSession });
            await TaskModel.updateMany(
              { projectUid: { $in: projectUids }, assigneeUids: userUid },
              { $pull: { assigneeUids: userUid } },
              { session: mongoSession }
            );
          }

          const cypherPurgeGraph = `
            MATCH (u:User {uid: $userUid})-[r:INVITED_TO]->(t:Team {uid: $teamUid})
            OPTIONAL MATCH (tk:Task)-[:TASK_OF]->(p:Project)<-[:HAS_PROJECT]-(t)
            WHERE tk.creatorUid = $userUid OR (u)-[:ASSIGNED_TO]->(tk)
            FOREACH (target IN CASE WHEN tk.creatorUid = $userUid THEN [tk] ELSE [] END | DETACH DELETE target)
            DELETE r
          `;
          await neo4jTx.run(cypherPurgeGraph, { userUid, teamUid });

        } else {
          const refuseCypher = `
            MATCH (u:User {uid: $userUid})-[r:INVITED_TO]->(t:Team {uid: $teamUid})
            DELETE r
            MERGE (u)-[m:REFUSED_INVITATION]->(t)
            SET m.refusedAt = datetime()
            RETURN 1
          `;
          await neo4jTx.run(refuseCypher, { userUid, teamUid });
        }
        return true;
      });
    } catch (txErr: any) {
      console.error("🌋 [TRANSACTION RESPOND ERROR]", txErr);
      const status = txErr.status || txErr.statusCode || 500;
      return NextResponse.json({ error: txErr.message || "Échec de l'application du pacte." }, { status });
    }

    const teamName = (team as any).name || 'Nid';

    return NextResponse.json({ 
      success: true, 
      message: action === 'ACCEPT' 
        ? `Pacte signé avec succès. Bienvenue dans l'escouade "${teamName}".` 
        : action === 'PURGE_REFUSE'
        ? `Invitation pour le Nid "${teamName}" déclinée et traces intégralement nettoyées.`
        : `Invitation pour le Nid "${teamName}" déclinée avec souveraineté.`
    }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Fracture globale lors de la signature du pacte d'adhésion :", error);
    const status = error.statusCode || error.status || 500;
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status });
  }
}