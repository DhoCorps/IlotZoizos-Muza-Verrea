import { NextResponse } from 'next/server';
import { TeamModel, getNeo4jSession } from "@ilot/infrastructure"; 
import { TeamOrchestrator } from "@ilot/shared-core";
import { TeamSchema, CAPABILITIES, ActionSignature } from "@ilot/types";
import { unstable_cache, revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards'; // 🪡 Import strict de l'ApiContext

export const dynamic = 'force-dynamic';

interface TeamMember {
  uid: string;
  pseudo: string;
  signature?: string | null;
}

// -------------------------------------------------------------------------
// 🧠 CACHE CHIRURGICAL : Récupération des Nids d'un Oiseau (Neo4j + Mongo)
// -------------------------------------------------------------------------
const getCachedUserTeams = (userUid: string) => {
  return unstable_cache(
    async () => {
      const neo4jSession = getNeo4jSession();
      const relMap = new Map();
      const memberMap = new Map();
      const invitationMap = new Map();
      
      try {
        // 1. Trouver les nids de l'Oiseau
        const cypher = `
          MATCH (u:User {uid: $userUid})-[r:FOUNDED|MEMBER_OF|INVITED_TO]->(t:Team)
          RETURN t.uid AS teamUid, type(r) AS relType
        `;
        const result = await neo4jSession.run(cypher, { userUid });
        result.records.forEach(record => {
          relMap.set(record.get('teamUid'), record.get('relType'));
        });

        const teamUids = Array.from(relMap.keys());
        if (teamUids.length === 0) return []; // Aucun Nid

        // 2. Pour chaque Nid, récupérer les membres et invitations
        for (const tUid of teamUids) {
          const memberCypher = `
            MATCH (m:User)-[:FOUNDED|MEMBER_OF]->(t:Team {uid: $tUid})
            RETURN DISTINCT m.uid AS uid, m.pseudo AS pseudo, m.signature AS signature
          `;
          const memberResult = await neo4jSession.run(memberCypher, { tUid });
          const members = memberResult.records.map(rec => ({
            uid: rec.get('uid'),
            pseudo: rec.get('pseudo'),
            signature: rec.get('signature') || null
          }));
          memberMap.set(tUid, members);

          const inviteCypher = `
            MATCH (target:User)-[r:INVITED_TO|REFUSED_INVITATION]->(t:Team {uid: $tUid})
            RETURN DISTINCT target.uid AS uid, target.pseudo AS pseudo, type(r) AS relType
          `;
          const inviteResult = await neo4jSession.run(inviteCypher, { tUid });
          const invitations = inviteResult.records.map((record: any) => ({
            uid: record.get('uid'),
            pseudo: record.get('pseudo'),
            status: record.get('relType') === 'INVITED_TO' ? 'PENDING' : 'REFUSED'
          }));
          invitationMap.set(tUid, invitations);
        }
      } finally {
        try { await neo4jSession.close(); } catch (e) {}
      }

      // 3. Récupérer les données MongoDB
      const teamUids = Array.from(relMap.keys());
      const teams = await TeamModel.find({ uid: { $in: teamUids } }).lean();

      // 4. Fusionner les données (Graphe + Silice)
      const populatedTeams = teams.map(team => ({
        ...team,
        isInvitation: relMap.get(team.uid!) === 'INVITED_TO',
        members: memberMap.get(team.uid!) || [],
        invitations: invitationMap.get(team.uid!) || []
      }));

      // 5. Harmonisation des Fondateurs (Sanitization)
      return populatedTeams.map(team => {
        const existingMemberUids = new Set(team.members.map((m: TeamMember) => m.uid));
        if (!existingMemberUids.has(team.ownerUid)) {
          team.members.unshift({ uid: team.ownerUid, pseudo: "L'Architecte (Fondateur)", signature: "Créateur" });
        } else {
          team.members = team.members.map((m: TeamMember) => {
            if (m.uid === team.ownerUid && !m.pseudo) {
              return { ...m, pseudo: "L'Architecte (Fondateur)", signature: "Créateur" };
            }
            return m;
          });
        }
        return team;
      });
    },
    [`user-teams-${userUid}`], // 🏷️ Identifiant unique par Utilisateur
    { 
      revalidate: 60, 
      tags: ['teams', `teams-${userUid}`] 
    }
  )(); // ⚡ Exécution
};


// ==========================================
// 🔍 GET : Recensement des Nids de l'Oiseau
// ==========================================
export const GET = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const userTeams = await getCachedUserTeams(currentUser.uid);
    return NextResponse.json(userTeams, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Erreur globale lors de la récupération des Nids unifiés :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
});


// ==========================================
// 📤 POST : Fonder une nouvelle escouade (Nid)
// ==========================================
export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    // 🛡️ VÉRIFICATION 403 DES DROITS (Le 401 est déjà géré par withAura)
    const hasPermission = currentUser.capabilities.includes(CAPABILITIES.TEAM.CREATE) || currentUser.capabilities.includes('*');

    if (!hasPermission) {
        console.warn(`🚫 [Auth] Tentative de fondation sans droits par : ${currentUser.uid}`);
        return NextResponse.json({ 
          error: "Aura insuffisante pour fonder un Nid.",
          debug_plumes: currentUser.capabilities 
        }, { status: 403 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "L'onde est muette : Corps de requête invalide ou manquant." }, { status: 400 });
    }

    const creationSchema = TeamSchema.omit({ uid: true, ownerUid: true, leaderUid: true });
    const validated = creationSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ errors: validated.error.flatten() }, { status: 400 });
    }

    const signature: ActionSignature = { actorUid: currentUser.uid, capabilities: currentUser.capabilities };

    const teamEngine = new TeamOrchestrator();
    const result = await teamEngine.fosterTeam({
      ...validated.data,
      ownerUid: currentUser.uid,
      leaderUid: currentUser.uid
    }, signature); 

    // 💥 BOOM ! Le Nid est créé. On invalide le cache de CE créateur pour que son interface se mette à jour.
    revalidateTag(`teams-${currentUser.uid}`);
    revalidateTag('teams');

    return NextResponse.json(result, { status: 201 });

  } catch (error: any) {
    console.error("🔥 Erreur globale de fondation :", error);
    const status = error.statusCode || error.status || 500;
    return NextResponse.json({ error: error.message || "Erreur lors de la fondation." }, { status });
  }
});