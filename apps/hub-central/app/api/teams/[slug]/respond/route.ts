export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { TeamModel, OiseauModel, ProjectModel, TaskModel, findEntityBySlugOrUid, getNeo4jSession } from '@ilot/infrastructure'; 
import { TransactionManager } from '@ilot/shared-core';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards'; // 🪡 Notre bouclier souverain strict
import { z } from 'zod';

// 🛡️ Schéma de validation Zod pour la réponse au Pacte d'Adhésion
const RespondTeamSchema = z.object({
  action: z.enum(['ACCEPT', 'REFUSE', 'PURGE_REFUSE'], { message: "Mouvement invalide sur le Pacte." }),
});

// ==========================================
// 🤝 POST : Réponse au Pacte d'Adhésion (ACCEPT / REFUSE / PURGE_REFUSE)
// ==========================================
export const POST = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const userUid = currentUser.uid;

    // 1. Décodage sécurisé et validation immédiate par Zod du corps de requête (avant toute IO)
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "L'onde est muette : Corps de requête invalide ou manquant." }, { status: 400 });
    }

    const validation = RespondTeamSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: "Mouvement invalide sur le Pacte.", details: validation.error.flatten() }, { status: 400 });
    }

    const { action } = validation.data; 

    // 2. Résolution stricte et typée des paramètres de route
    const resolvedParams = await context.params;
    const rawSlug = resolvedParams?.slug;
    const teamIdentifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!teamIdentifier) {
      return NextResponse.json({ success: false, error: "Identifiant de nid (slug) invalide." }, { status: 400 });
    }

    // 🔍 3. Résolution unifiée du Nid par slug ou UID via notre helper centralisé
    const team = (await findEntityBySlugOrUid(TeamModel, teamIdentifier)) as { uid?: string; slug?: string; name?: string; _id?: unknown; [key: string]: unknown } | null;
    if (!team) {
      return NextResponse.json({ success: false, error: "Ce Nid s'est volatilisé de la Silice." }, { status: 404 });
    }

    const teamUid = team.uid || teamIdentifier;
    const teamSlug = team.slug;

    // 4. Validation de l'invitation dans le Graphe Neo4j
    const neoSession = getNeo4jSession();
    let invitationCapabilities: string[] = [];
    try {
      if (!neoSession) {
        invitationCapabilities = [];
      } else {
        const checkCypher = `
          MATCH (u:User {uid: $userUid})-[r:INVITED_TO]->(t:Team {uid: $teamUid})
          RETURN r.capabilities AS caps
        `;
        const checkResult = await neoSession.run(checkCypher, { userUid, teamUid });
        
        if (checkResult.records.length === 0) {
          return NextResponse.json({ 
            success: false, 
            error: "Souveraineté violée : Aucune invitation en attente pour ce Nid." 
          }, { status: 404 }); // 🛡️ Remplacement propre du 451 par 404 Not Found
        }
        
        invitationCapabilities = (checkResult.records[0].get('caps') || []) as string[];
      }
    } catch (neoCheckErr) {
      console.error("🔥 [NEO4J INVITATION CHECK ERROR]", neoCheckErr);
      return NextResponse.json({ success: false, error: "Échec de vérification du pacte dans le Graphe." }, { status: 500 });
    } finally {
      if (neoSession) {
        try { await neoSession.close(); } catch {}
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
          const projects = (await ProjectModel.find({ ownerUid: teamUid }).session(mongoSession).lean()) as Array<{ uid: string }>;
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
    } catch (txErr: unknown) {
      const err = txErr as { status?: number; statusCode?: number; message?: string };
      console.error("🌋 [TRANSACTION RESPOND ERROR]", err);
      const status = err.status || err.statusCode || 500;
      return NextResponse.json({ success: false, error: err.message || "Échec de l'application du pacte." }, { status });
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

  } catch (error: unknown) {
    return handleRouteError(error, "TEAM RESPOND FATAL ERROR");
  }
});