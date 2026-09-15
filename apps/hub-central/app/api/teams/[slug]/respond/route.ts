import { NextResponse } from 'next/server';
import { TeamModel, OiseauModel, ProjectModel, TaskModel, findEntityBySlugOrUid, getNeo4jSession } from '@ilot/infrastructure'; 
import { TransactionManager } from '@ilot/shared-core';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards'; // 🪡 Notre bouclier souverain strict

export const dynamic = 'force-dynamic';

// ==========================================
// 🤝 POST : Réponse au Pacte d'Adhésion (ACCEPT / REFUSE / PURGE_REFUSE)
// ==========================================
export const POST = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const userUid = currentUser.uid;

    // 1. Décodage sécurisé et validation immédiate du corps de requête (avant toute IO)
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

    // 2. Résolution stricte et typée des paramètres de route
    const resolvedParams = await context.params;
    const rawSlug = resolvedParams?.slug;
    const teamIdentifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!teamIdentifier) {
      return NextResponse.json({ error: "Identifiant de nid (slug) invalide." }, { status: 400 });
    }

    // 🔍 3. Résolution unifiée du Nid par slug ou UID via notre helper centralisé
    const team: any = await findEntityBySlugOrUid(TeamModel, teamIdentifier);
    if (!team) {
      return NextResponse.json({ error: "Ce Nid s'est volatilisé de la Silice." }, { status: 404 });
    }

    const teamUid = team.uid;
    const teamSlug = team.slug;

    // 4. Validation de l'invitation dans le Graphe Neo4j
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
        try { await neoSession.close(); } catch (closeErr) {}
      }
    }

    // 5. Exécution transactionnelle de la réponse au Pacte
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
            { $addToSet: { teams: team._id } }, 
            { session: mongoSession }
          );
        } else if (action === 'PURGE_REFUSE') {
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

    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade
    revalidateTag(`teams-${userUid}`);
    revalidateTag('teams');
    revalidateTag(`team-${teamIdentifier}`);
    if (teamSlug) revalidateTag(`team-${teamSlug}`);
    if (team.uid) revalidateTag(`team-${team.uid}`);

    const teamName = team.name || 'Nid';

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
});