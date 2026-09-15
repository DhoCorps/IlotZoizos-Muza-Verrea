import { NextResponse } from 'next/server';
import { TeamModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { TransactionManager } from '@ilot/shared-core';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards'; // 🪡 Notre bouclier souverain strict

export const dynamic = 'force-dynamic';

// ==========================================
// 🧨 DELETE : Révocation d'une invitation sur un Nid
// ==========================================
export const DELETE = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    // 1. Résolution stricte et typée des paramètres dynamiques de l'URL
    const resolvedParams = await context.params;
    const rawSlug = resolvedParams?.slug;
    const rawTargetUid = resolvedParams?.targetUid;

    const teamIdentifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    const targetUid = typeof rawTargetUid === 'string' ? rawTargetUid.trim() : Array.isArray(rawTargetUid) ? rawTargetUid[0]?.trim() : '';

    if (!teamIdentifier) {
      return NextResponse.json({ error: "Identifiant de nid (slug) invalide." }, { status: 400 });
    }

    if (!targetUid) {
      return NextResponse.json({ error: "UID cible (targetUid) manquant dans la route." }, { status: 400 });
    }

    // 🔍 2. Récupération unifiée du Nid dans la Silice via notre helper centralisé (Slug ou UID)
    const team: any = await findEntityBySlugOrUid(TeamModel, teamIdentifier);

    if (!team) {
      return NextResponse.json({ error: "Nid introuvable dans la Silice." }, { status: 404 });
    }

    const teamId = team.uid;
    const teamRealSlug = team.slug;

    // 3. 🛡️ DOUBLE VERROU DE GOUVERNANCE (Propriétaire du Nid ou Architecte global)
    const isNestOwner = team.ownerUid === currentUser.uid;
    const isArchitect = currentUser.capabilities?.includes('*') || false;

    if (!isNestOwner && !isArchitect) {
      return NextResponse.json({ 
        error: "Aura insuffisante pour révoquer une invitation sur ce territoire." 
      }, { status: 403 });
    }

    // 4. Exécution transactionnelle de la révocation (Mongo / Neo4j) en utilisant le targetUid validé
    try {
      await TransactionManager.execute("Révocation d'Invitation", async (_mongoSession, neo4jTx) => {
        const cypherRevoke = `
          MATCH (u:User {uid: $targetUid})-[r:INVITED_TO]->(t:Team {uid: $teamId})
          DELETE r
          RETURN 1
        `;
        
        const result = await neo4jTx.run(cypherRevoke, { targetUid, teamId });

        if (result.records.length === 0) {
          throw new Error("Aucune invitation active ou en attente trouvée pour cet oiseau.");
        }
        
        return true;
      });
    } catch (txErr: any) {
      console.error("🌋 [TRANSACTION REVOKE ERROR]", txErr);
      const status = txErr.status || txErr.statusCode || 400;
      return NextResponse.json({ error: txErr.message || "L'action de gouvernance a échoué." }, { status });
    }

    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade
    revalidateTag('teams');
    revalidateTag(`team-${teamIdentifier}`);
    if (teamRealSlug) revalidateTag(`team-${teamRealSlug}`);
    revalidateTag(`teams-${targetUid}`);

    return NextResponse.json({ 
      success: true, 
      message: "L'invitation a été révoquée et les fréquences ont été nettoyées." 
    }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Fracture globale lors de la révocation de l'invitation :", error);
    return NextResponse.json({ error: error.message || "L'action de gouvernance a échoué." }, { status: 500 });
  }
});