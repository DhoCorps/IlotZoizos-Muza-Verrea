// Fichier : lib/cache/teams.cache.ts
import { unstable_cache } from 'next/cache';
import { TeamModel, getNeo4jSession } from "@ilot/infrastructure";

interface TeamMember {
  uid: string;
  pseudo: string;
  signature?: string | null;
}

const neo4jSession = getNeo4jSession();

// -------------------------------------------------------------------------
// 1. CACHE CHIRURGICAL : Récupération des Nids d'un Oiseau (Neo4j + Mongo)
// -------------------------------------------------------------------------
export const getCachedUserTeams = (userUid: string) => {
  return unstable_cache(
    async () => {
      const neo4jSession = getNeo4jSession();
      const relMap = new Map();
      const memberMap = new Map();
      const invitationMap = new Map();
             
      try {
        const cypher = `
          MATCH (u:User {uid: $userUid})-[r:FOUNDED|MEMBER_OF|INVITED_TO]->(t:Team)
          RETURN t.uid AS teamUid, type(r) AS relType
        `;
        const result = await neo4jSession.run(cypher, { userUid });
        result.records.forEach(record => {
          relMap.set(record.get('teamUid'), record.get('relType'));
        });
        const teamUids = Array.from(relMap.keys());
        if (teamUids.length === 0) return [];

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

      const teamUids = Array.from(relMap.keys());
      const teams = await TeamModel.find({ uid: { $in: teamUids } }).lean();

      const populatedTeams = teams.map(team => ({
        ...team,
        isInvitation: relMap.get(team.uid!) === 'INVITED_TO',
        members: memberMap.get(team.uid!) || [],
        invitations: invitationMap.get(team.uid!) || []
      }));

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
    [`user-teams-${userUid}`],
    {
      revalidate: 60,
      tags: ['teams', `teams-${userUid}`]
    }
  )();
};

// -------------------------------------------------------------------------
// 2. CACHE CHIRURGICAL : Récupération et Auscultation d'un Nid Spécifique
// -------------------------------------------------------------------------
export const getCachedTeamDetails = (teamIdentifier: string, userUid: string, getCapabilitiesFn: Function) => {
  return unstable_cache(
    async () => {
      const team = await TeamModel.findOne({
        $or: [{ slug: teamIdentifier }, { uid: teamIdentifier }]
      }).lean();
      if (!team) return null;
      
      const teamUid = (team as any).uid;
      const caps = await getCapabilitiesFn(userUid, teamUid);
      const neoSession = getNeo4jSession();
      let invitations: any[] = [];
      
      try {
        const inviteCypher = `
          MATCH (target:User)-[r:INVITED_TO|REFUSED_INVITATION]->(t:Team {uid: $teamUid})
          RETURN target.uid AS uid, target.pseudo AS pseudo, type(r) AS relType
        `;
        const inviteResult = await neo4jSession.run(inviteCypher, { teamUid });
        invitations = inviteResult.records.map((record: any) => ({
          uid: record.get('uid'),
          pseudo: record.get('pseudo'),
          status: record.get('relType') === 'INVITED_TO' ? 'PENDING' : 'REFUSED'
        }));
      } catch (inviteErr) {
        console.error("  [INVITATIONS QUERY ERROR]", inviteErr);
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