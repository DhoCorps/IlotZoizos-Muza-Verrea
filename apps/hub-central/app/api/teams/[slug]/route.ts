import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { TeamOrchestrator } from "@ilot/shared-core";
import { getNeo4jSession, connectToDatabase, TeamModel } from '@ilot/infrastructure';
import { CAPABILITIES, ActionSignature } from '@ilot/types'; 
import { authOptions } from "@/lib/auth";
import { slugify } from '@/lib/slugify';


/**
 * 🌿 INTERFACE DES PARAMÈTRES DE ROUTE ([slug])
 * Conforme à l'exigence asynchrone de Next.js 15+ pour les segments dynamiques.
 */
interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * 🛡️ UTILITAIRE DE DOUANE (Garde Frontière)
 * Interroge le Graphe Muet pour récupérer TOUTES les capacités de cet Oiseau sur ce Nid.
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

// ==========================================
// 🔍 GET : Découverte du Nid (Mode Consentement Éclairé)
// ==========================================
export async function GET(req: Request, { params }: RouteParams) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR TEAM GET]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }
    
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR TEAM GET]", sessionErr);
      return NextResponse.json({ error: "Erreur de lecture d'Aura." }, { status: 500 });
    }

    const userUid = (session?.user as any)?.uid;
    if (!userUid) return NextResponse.json({ error: "Oiseau non identifié" }, { status: 401 });

    let rawSlug;
    try {
      const resolvedParams = await params;
      rawSlug = resolvedParams.slug;
    } catch (paramErr) {
      return NextResponse.json({ error: "Identifiant de nid invalide." }, { status: 400 });
    }

    const teamIdentifier = slugify(rawSlug || '');

    let team;
    try {
      team = await TeamModel.findOne({ 
        $or: [{ slug: teamIdentifier }, { uid: teamIdentifier }] 
      }).lean();
    } catch (queryErr) {
      console.error("🔥 [TEAM QUERY ERROR]", queryErr);
      return NextResponse.json({ error: "Échec de lecture du Nid." }, { status: 500 });
    }

    if (!team) return NextResponse.json({ error: "Nid introuvable dans la silice." }, { status: 404 });
    const teamUid = (team as any).uid;

    let caps: string[] = [];
    try {
      caps = await getCapabilities(userUid, teamUid);
    } catch (capErr) {
      console.error("🔥 [CAPS CHECK ERROR]", capErr);
    }
    
    if (!caps.includes(CAPABILITIES.TEAM.READ) && !caps.includes('*')) {
      return NextResponse.json({ error: "Ce territoire t'est inconnu. Accès refusé." }, { status: 403 });
    }

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
        try {
          await neoSession.close();
        } catch (closeErr) {}
      }
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
}

// ==========================================
// 🏗️ PUT : Édition du Nid (Mutation de structure)
// ==========================================
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR TEAM PUT]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }
    
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR TEAM PUT]", sessionErr);
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    const userUid = (session?.user as any)?.uid;
    if (!userUid) return NextResponse.json({ error: "Oiseau non identifié" }, { status: 401 });

    let rawSlug;
    try {
      const resolvedParams = await params;
      rawSlug = resolvedParams.slug;
    } catch (paramErr) {
      return NextResponse.json({ error: "Identifiant de nid invalide." }, { status: 400 });
    }

    const teamIdentifier = slugify(rawSlug || '');

    let team;
    try {
      team = await TeamModel.findOne({ 
        $or: [{ slug: teamIdentifier }, { uid: teamIdentifier }] 
      }).lean();
    } catch (queryErr) {
      console.error("🔥 [TEAM QUERY ERROR]", queryErr);
      return NextResponse.json({ error: "Échec de lecture du Nid." }, { status: 500 });
    }

    if (!team) return NextResponse.json({ error: "Nid introuvable." }, { status: 404 });
    const teamUid = (team as any).uid;

    let caps: string[] = [];
    try {
      caps = await getCapabilities(userUid, teamUid);
    } catch (e) {}
    
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
        actorUid: userUid,
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

    return NextResponse.json(updatedTeam, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale PUT Team:", error);
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status });
  }
}

// ==========================================
// 🧨 DELETE : Dissolution du Nid
// ==========================================
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR TEAM DELETE]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }
    
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR TEAM DELETE]", sessionErr);
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    const userUid = (session?.user as any)?.uid;
    if (!userUid) return NextResponse.json({ error: "Oiseau non identifié" }, { status: 401 });

    let rawSlug;
    try {
      const resolvedParams = await params;
      rawSlug = resolvedParams.slug;
    } catch (paramErr) {
      return NextResponse.json({ error: "Identifiant de nid invalide." }, { status: 400 });
    }

    const teamIdentifier = slugify(rawSlug || '');

    let team;
    try {
      team = await TeamModel.findOne({ 
        $or: [{ slug: teamIdentifier }, { uid: teamIdentifier }] 
      }).lean();
    } catch (queryErr) {
      console.error("🔥 [TEAM QUERY ERROR]", queryErr);
      return NextResponse.json({ error: "Échec de lecture du Nid." }, { status: 500 });
    }

    if (!team) return NextResponse.json({ error: "Nid introuvable." }, { status: 404 });
    const teamUid = (team as any).uid;

    let caps: string[] = [];
    try {
      caps = await getCapabilities(userUid, teamUid);
    } catch (e) {}
    
    if (!caps.includes(CAPABILITIES.TEAM.DELETE) && !caps.includes('*')) {
        return NextResponse.json({ error: "Seul l'Architecte de ce Nid peut le dissoudre." }, { status: 403 });
    }

    const signature: ActionSignature = {
        actorUid: userUid,
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

    return NextResponse.json({ 
      message: "Le Nid a été dissous. Les oiseaux ont pris leur envol." 
    }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale DELETE Team:", error);
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status });
  }
}