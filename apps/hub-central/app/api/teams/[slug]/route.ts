export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { TeamModel, findEntityBySlugOrUid, getNeo4jSession } from "@ilot/infrastructure"; 
import { TeamOrchestrator } from "@ilot/shared-core";
import { CAPABILITIES, ActionSignature, ITeam } from "@ilot/types";
import { unstable_cache, revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards'; // 🪡 Notre bouclier souverain
import { slugify } from '@/lib/slugify';
import { z } from 'zod';

// 🛡️ Schéma Zod strict pour interdire l'assignation de masse (Mass Assignment) sur les Nids
const UpdateTeamSchema = z.object({
  name: z.string().min(1, "Le nom du Nid est requis.").optional(),
  description: z.string().max(1000).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  coverPicture: z.string().url().nullable().optional(),
  isPublic: z.boolean().optional(),
  settings: z.object({
    isGlobalReducedSpeed: z.boolean().optional(),
    allowSearch: z.boolean().optional(),
    defaultLocale: z.string().optional(),
  }).partial().optional(),
});

/**
 * 🛡️ UTILITAIRE DE DOUANE (Garde Frontière)
 * Interroge le Graphe pour récupérer TOUTES les capacités de cet Oiseau sur ce Nid.
 */
async function getCapabilities(userUid: string, teamUid: string): Promise<string[]> {
  let session = null;
  try {
    session = getNeo4jSession();
    if (!session) return [];

    const result = await session.run(
      `MATCH (u:User {uid: $userUid})-[r:MEMBER_OF|FOUNDED|INVITED_TO]->(t:Team {uid: $teamUid})
       RETURN r.capabilities AS caps, type(r) AS relType`,
      { userUid, teamUid }
    );
    
    if (!result || result.records.length === 0) return []; 
    
    let compiledCaps: string[] = [];
    let isInvited = false;

    result.records.forEach((record) => {
      const caps = (record.get('caps') || []) as string[];
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
    // 🛡️ GARANTIE STRICTE ANTI-FUITE DE CONNEXION NEO4J (Pool Leak Prevention)
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
      // 🔍 Utilisation de notre helper unifié
      const team = (await findEntityBySlugOrUid(TeamModel, teamIdentifier)) as { uid?: string; [key: string]: unknown } | null;

      if (!team) return null;
      const teamUid = team.uid || teamIdentifier;

      const caps = await getCapabilities(userUid, teamUid);

      let neoSession = null;
      let invitations: Array<{ uid: string; pseudo: string; status: string }> = [];
      try {
        neoSession = getNeo4jSession();
        if (neoSession) {
          const inviteCypher = `
            MATCH (target:User)-[r:INVITED_TO|REFUSED_INVITATION]->(t:Team {uid: $teamUid})
            RETURN target.uid AS uid, target.pseudo AS pseudo, type(r) AS relType
          `;
          const inviteResult = await neoSession.run(inviteCypher, { teamUid });
          invitations = inviteResult.records.map((record) => ({
            uid: record.get('uid') as string,
            pseudo: record.get('pseudo') as string,
            status: record.get('relType') === 'INVITED_TO' ? 'PENDING' : 'REFUSED'
          }));
        }
      } catch (inviteErr) {
        console.error("🔥 [INVITATIONS QUERY ERROR]", inviteErr);
      } finally {
        if (neoSession) {
          try { 
            await neoSession.close(); 
          } catch (e) {
            console.error("⚠️ Erreur fermeture session Neo4j (Invitations) :", e);
          }
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
export const GET = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    let resolvedParams;
    try {
      resolvedParams = await context.params;
    } catch {
      return NextResponse.json({ success: false, error: "Paramètres de route invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const teamIdentifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!teamIdentifier) {
      return NextResponse.json({ success: false, error: "Identifiant de nid (slug) invalide." }, { status: 400 });
    }

    // ⚡ Appel au cache chirurgical
    const data = await getCachedTeamDetails(teamIdentifier, currentUser.uid);

    if (!data || !data.team) {
      return NextResponse.json({ success: false, error: "Nid introuvable dans la silice." }, { status: 404 });
    }

    const { team, caps, invitations } = data;

    if (!caps.includes(CAPABILITIES.TEAM.READ) && !caps.includes('*') && !currentUser.capabilities?.includes('*')) {
      return NextResponse.json({ success: false, error: "Ce territoire t'est inconnu. Accès refusé." }, { status: 403 });
    }

    return NextResponse.json({
      ...team,
      myCapabilities: caps,
      invitations 
    }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, "TEAM GET FATAL ERROR");
  }
});

// ==========================================
// 🏗️ PUT : Édition du Nid (Mutation de structure)
// ==========================================
export const PUT = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    let resolvedParams;
    try {
      resolvedParams = await context.params;
    } catch {
      return NextResponse.json({ success: false, error: "Paramètres de route invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const teamIdentifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!teamIdentifier) {
      return NextResponse.json({ success: false, error: "Identifiant de nid (slug) invalide." }, { status: 400 });
    }

    // 🔍 Résolution unifiée de l'équipe
    const team = (await findEntityBySlugOrUid(TeamModel, teamIdentifier)) as { uid?: string; slug?: string; [key: string]: unknown } | null;
    if (!team) return NextResponse.json({ success: false, error: "Nid introuvable." }, { status: 404 });

    const teamUid = team.uid || teamIdentifier;
    const teamSlug = team.slug;

    const caps = await getCapabilities(currentUser.uid, teamUid);
    
    if (!caps.includes(CAPABILITIES.TEAM.UPDATE) && !caps.includes('*') && !currentUser.capabilities?.includes('*')) {
        return NextResponse.json({ success: false, error: "Tu n'as pas l'aura nécessaire pour modifier ce Nid." }, { status: 403 });
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Corps de requête illisible." }, { status: 400 });
    }

    // 🛡️ Validation et assainissement stricts via Zod (Blocage du Mass Assignment)
    const validation = UpdateTeamSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: "Données de mutation de nid invalides.", details: validation.error.flatten() }, { status: 400 });
    }
    const sanitizedData = validation.data;

    const signature: ActionSignature = {
        actorUid: currentUser.uid,
        capabilities: caps
    };

    let updatedTeam;
    try {
      const teamEngine = new TeamOrchestrator(); 
      updatedTeam = await teamEngine.mutateTeam(teamUid, sanitizedData as Partial<ITeam>, signature);
    } catch (orchErr: unknown) {
      const err = orchErr as { status?: number; statusCode?: number; message?: string };
      console.error("🌋 [TEAM ORCHESTRATOR MUTATE ERROR]", err);
      const status = err.statusCode || err.status || 500;
      return NextResponse.json({ success: false, error: err.message || "Échec de mutation du Nid." }, { status });
    }

    // 💥 BOOM ! Invalidation des caches de ce Nid en cascade
    revalidateTag('teams');
    revalidateTag(`team-${teamIdentifier}`);
    if (teamSlug) revalidateTag(`team-${teamSlug}`);
    if (team.uid) revalidateTag(`team-${team.uid}`);

    return NextResponse.json(updatedTeam, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, "TEAM PUT FATAL ERROR");
  }
});

// ==========================================
// 🧨 DELETE : Dissolution du Nid
// ==========================================
export const DELETE = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    let resolvedParams;
    try {
      resolvedParams = await context.params;
    } catch {
      return NextResponse.json({ success: false, error: "Paramètres de route invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const teamIdentifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!teamIdentifier) {
      return NextResponse.json({ success: false, error: "Identifiant de nid (slug) invalide." }, { status: 400 });
    }

    // 🔍 Résolution unifiée de l'équipe
    const team = (await findEntityBySlugOrUid(TeamModel, teamIdentifier)) as { uid?: string; slug?: string; [key: string]: unknown } | null;
    if (!team) return NextResponse.json({ success: false, error: "Nid introuvable." }, { status: 404 });

    const teamUid = team.uid || teamIdentifier;
    const teamSlug = team.slug;

    const caps = await getCapabilities(currentUser.uid, teamUid);
    
    if (!caps.includes(CAPABILITIES.TEAM.DELETE) && !caps.includes('*') && !currentUser.capabilities?.includes('*')) {
        return NextResponse.json({ success: false, error: "Seul l'Architecte de ce Nid peut le dissoudre." }, { status: 403 });
    }

    const signature: ActionSignature = {
        actorUid: currentUser.uid,
        capabilities: caps
    };

    try {
      const teamEngine = new TeamOrchestrator(); 
      await teamEngine.dissolveTeam(teamUid, signature);
    } catch (orchErr: unknown) {
      const err = orchErr as { status?: number; statusCode?: number; message?: string };
      console.error("🌋 [TEAM ORCHESTRATOR DISSOLVE ERROR]", err);
      const status = err.statusCode || err.status || 500;
      return NextResponse.json({ success: false, error: err.message || "Échec de dissolution du Nid." }, { status });
    }

    // 💥 BOOM ! Dissolution : Invalidation globale et spécifique en cascade
    revalidateTag('teams');
    revalidateTag(`team-${teamIdentifier}`);
    if (teamSlug) revalidateTag(`team-${teamSlug}`);
    if (team.uid) revalidateTag(`team-${team.uid}`);

    return NextResponse.json({ 
      success: true,
      message: "Le Nid a été dissous. Les oiseaux ont pris leur envol." 
    }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, "TEAM DELETE FATAL ERROR");
  }
});