import { NextResponse } from 'next/server';
import { TeamModel, getNeo4jSession } from "@ilot/infrastructure"; 
import { TeamOrchestrator } from "@ilot/shared-core";
import { CAPABILITIES, ActionSignature } from "@ilot/types";
import { unstable_cache, revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards'; // 🪡 Notre bouclier souverain
import { slugify } from '@/lib/slugify';

export const dynamic = 'force-dynamic';

/**
 * 🛡️ UTILITAIRE DE DOUANE (Garde Frontière)
 * Interroge le Graphe pour récupérer TOUTES les capacités de cet Oiseau sur ce Nid.
 */
async function getCapabilities(userUid: string, teamUid: string): Promise<string[]> {
  let session;
  try {
    session = getNeo4jSession();
    const result = await session.run(
      `MATCH (u:User {uid: $userUid})-[r:MEMBER_OF|FOUNDED|INVITED_TO]->(t:Team {uid: $teamUid})
       RETURN r.capabilities AS caps, type(r) AS relType`,
      { userUid, teamUid }
    );
    
    if (result.records.length === 0) return []; 
    
    let compiledCaps: string[] = [];
    let isInvited = false;
    
    result.records.forEach(record => {
      const caps = record.get('caps') || [];
      compiledCaps = [...compiledCaps, ...caps];
      if (record.get('relType') === 'INVITED_TO') {
        isInvited = true;
      }
    });
    
    let uniqueCaps = [...new Set(compiledCaps)];
    
    // 🌟 VISITEUR D'HONNEUR : Si l'oiseau est invité, on lui octroie le droit de regarder le Nid
    if (isInvited) {
      if (!uniqueCaps.includes(CAPABILITIES.TEAM.READ)) uniqueCaps.push(CAPABILITIES.TEAM.READ);
      if (!uniqueCaps.includes(CAPABILITIES.PROJECT.READ)) uniqueCaps.push(CAPABILITIES.PROJECT.READ);
    }
    
    return uniqueCaps;
  } catch (error) {
    console.error("🔥 [CAPABILITIES ERROR] Erreur lors de l'auscultation de l'Aura :", error);
    return [];
  } finally {
    if (session) {
      try {
        await session.close();
      } catch (closeErr) {
        console.error("⚠️ Erreur fermeture session Neo4j :", closeErr);
      }
    }
  }
}

// -------------------------------------------------------------------------
// 🧠 CACHE CHIRURGICAL : Récupération et Auscultation d'un Nid
// -------------------------------------------------------------------------
const getCachedTeamDetails = (teamIdentifier: string, userUid: string) => {
  return unstable_cache(
    async () => {
      const team = await TeamModel.findOne({ 
        $or: [{ slug: teamIdentifier }, { uid: teamIdentifier }] 
      }).lean();

      if (!team) return null;
      const teamUid = (team as any).uid;

      const caps = await getCapabilities(userUid, teamUid);

      const neoSession = getNeo4jSession();
      let invitations: any[] = [];
      try {
        const inviteCypher = `
          MATCH (target:User)-[r:INVITED_TO|REFUSED_INVITATION]->(t:Team {uid: $teamUid})
          RETURN target.uid AS uid, target.pseudo AS pseudo, type(r) AS relType
        `;
        const inviteResult = await neoSession.run(inviteCypher, { teamUid });
        invitations = inviteResult.records.map((record: any) => ({
          uid: record.get('uid'),
          pseudo: record.get('pseudo'),
          status: record.get('relType') === 'INVITED_TO' ? 'PENDING' : 'REFUSED'
        }));
      } catch (inviteErr) {
        console.error("🔥 [INVITATIONS QUERY ERROR]", inviteErr);
      } finally {
        if (neoSession) {
          try { await neoSession.close(); } catch (e) {}
        }
      }

      return {
        team,
        caps,
        invitations
      };
    },
    [`team-details-${teamIdentifier}-${userUid}`],
    { 
      revalidate: 60, 
      tags: ['teams', `team-${teamIdentifier}`] 
    }
  )();
};

// ==========================================
// 🔍 GET : Découverte du Nid (Mode Consentement Éclairé)
// ==========================================
export const GET = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const resolvedParams = await context.params;
    const rawSlug = resolvedParams?.slug;
    const teamIdentifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    // ⚡ Appel au cache chirurgical
    const data = await getCachedTeamDetails(teamIdentifier, currentUser.uid);

    if (!data || !data.team) {
      return NextResponse.json({ error: "Nid introuvable dans la silice." }, { status: 404 });
    }

    const { team, caps, invitations } = data;

    if (!caps.includes(CAPABILITIES.TEAM.READ) && !caps.includes('*')) {
      return NextResponse.json({ error: "Ce territoire t'est inconnu. Accès refusé." }, { status: 403 });
    }

    return NextResponse.json({
      ...team,
      myCapabilities: caps,
      invitations 
    }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale GET Team:", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
});

// ==========================================
// 🏗️ PUT : Édition du Nid (Mutation de structure)
// ==========================================
export const PUT = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const resolvedParams = await context.params;
    const rawSlug = resolvedParams?.slug;
    const teamIdentifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    const team = await TeamModel.findOne({ 
      $or: [{ slug: teamIdentifier }, { uid: teamIdentifier }] 
    }).lean();

    if (!team) return NextResponse.json({ error: "Nid introuvable." }, { status: 404 });
    const teamUid = (team as any).uid;
    const teamSlug = (team as any).slug;

    const caps = await getCapabilities(currentUser.uid, teamUid);
    
    if (!caps.includes(CAPABILITIES.TEAM.UPDATE) && !caps.includes('*')) {
        return NextResponse.json({ error: "Tu n'as pas l'aura nécessaire pour modifier ce Nid." }, { status: 403 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    const signature: ActionSignature = {
        actorUid: currentUser.uid,
        capabilities: caps
    };

    let updatedTeam;
    try {
      const teamEngine = new TeamOrchestrator(); 
      updatedTeam = await teamEngine.mutateTeam(teamUid, body, signature);
    } catch (orchErr: any) {
      console.error("🌋 [TEAM ORCHESTRATOR MUTATE ERROR]", orchErr);
      const status = orchErr.statusCode || orchErr.status || 500;
      return NextResponse.json({ error: orchErr.message || "Échec de mutation du Nid." }, { status });
    }

    // 💥 BOOM ! Invalidation des caches de ce Nid
    revalidateTag('teams');
    revalidateTag(`team-${teamIdentifier}`);
    if (teamSlug) revalidateTag(`team-${teamSlug}`);

    return NextResponse.json(updatedTeam, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale PUT Team:", error);
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status });
  }
});

// ==========================================
// 🧨 DELETE : Dissolution du Nid
// ==========================================
export const DELETE = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const resolvedParams = await context.params;
    const rawSlug = resolvedParams?.slug;
    const teamIdentifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    const team = await TeamModel.findOne({ 
      $or: [{ slug: teamIdentifier }, { uid: teamIdentifier }] 
    }).lean();

    if (!team) return NextResponse.json({ error: "Nid introuvable." }, { status: 404 });
    const teamUid = (team as any).uid;
    const teamSlug = (team as any).slug;

    const caps = await getCapabilities(currentUser.uid, teamUid);
    
    if (!caps.includes(CAPABILITIES.TEAM.DELETE) && !caps.includes('*')) {
        return NextResponse.json({ error: "Seul l'Architecte de ce Nid peut le dissoudre." }, { status: 403 });
    }

    const signature: ActionSignature = {
        actorUid: currentUser.uid,
        capabilities: caps
    };

    try {
      const teamEngine = new TeamOrchestrator(); 
      await teamEngine.dissolveTeam(teamUid, signature);
    } catch (orchErr: any) {
      console.error("🌋 [TEAM ORCHESTRATOR DISSOLVE ERROR]", orchErr);
      const status = orchErr.statusCode || orchErr.status || 500;
      return NextResponse.json({ error: orchErr.message || "Échec de dissolution du Nid." }, { status });
    }

    // 💥 BOOM ! Dissolution : Invalidation globale et spécifique
    revalidateTag('teams');
    revalidateTag(`team-${teamIdentifier}`);
    if (teamSlug) revalidateTag(`team-${teamSlug}`);

    return NextResponse.json({ 
      message: "Le Nid a été dissous. Les oiseaux ont pris leur envol." 
    }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale DELETE Team:", error);
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status });
  }
});