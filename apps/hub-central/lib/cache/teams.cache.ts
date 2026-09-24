// Fichier : lib/cache/teams.cache.ts
import { unstable_cache } from 'next/cache';
import { TeamModel, getNeo4jSession } from "@ilot/infrastructure";
import type { Record as Neo4jRecord } from 'neo4j-driver';

interface TeamMember {
  uid: string;
  pseudo: string;
  signature?: string | null;
}

interface TeamInvitation {
  uid: string;
  pseudo: string;
  status: 'PENDING' | 'REFUSED';
}

interface LeanTeamDocument {
  uid: string;
  ownerUid: string;
  slug?: string;
  [key: string]: unknown;
}

// -------------------------------------------------------------------------
// 1. CACHE CHIRURGICAL : Récupération des Nids d'un Oiseau (Neo4j + Mongo)
// -------------------------------------------------------------------------
export const getCachedUserTeams = (userUid: string) => {
  return unstable_cache(
    async () => {
      const neo4jSession = getNeo4jSession();
      const relMap = new Map<string, string>();
      const memberMap = new Map<string, TeamMember[]>();
      const invitationMap = new Map<string, TeamInvitation[]>();
               
      try {
        if (neo4jSession) {
          const cypher = `
            MATCH (u:User {uid: $userUid})-[r:FOUNDED|MEMBER_OF|INVITED_TO]->(t:Team)
            RETURN t.uid AS teamUid, type(r) AS relType
          `;
          const result = await neo4jSession.run(cypher, { userUid });
          result.records.forEach((record: Neo4jRecord) => {
            const teamUid = record.get('teamUid') as string;
            const relType = record.get('relType') as string;
            if (teamUid && relType) {
              relMap.set(teamUid, relType);
            }
          });
          const teamUids = Array.from(relMap.keys());
          if (teamUids.length === 0) return [];

          for (const tUid of teamUids) {
            const memberCypher = `
              MATCH (m:User)-[:FOUNDED|MEMBER_OF]->(t:Team {uid: $tUid})
              RETURN DISTINCT m.uid AS uid, m.pseudo AS pseudo, m.signature AS signature
            `;
            const memberResult = await neo4jSession.run(memberCypher, { tUid });
            const members: TeamMember[] = memberResult.records.map((rec: Neo4jRecord) => ({
              uid: rec.get('uid') as string,
              pseudo: rec.get('pseudo') as string,
              signature: (rec.get('signature') as string) || null
            }));
            memberMap.set(tUid, members);

            const inviteCypher = `
              MATCH (target:User)-[r:INVITED_TO|REFUSED_INVITATION]->(t:Team {uid: $tUid})
              RETURN DISTINCT target.uid AS uid, target.pseudo AS pseudo, type(r) AS relType
            `;
            const inviteResult = await neo4jSession.run(inviteCypher, { tUid });
            const invitations: TeamInvitation[] = inviteResult.records.map((record: Neo4jRecord) => ({
              uid: record.get('uid') as string,
              pseudo: record.get('pseudo') as string,
              status: record.get('relType') === 'INVITED_TO' ? 'PENDING' : 'REFUSED'
            }));
            invitationMap.set(tUid, invitations);
          }
        }
      } finally {
        try { await neo4jSession?.close(); } catch {}
      }

      const teamUids = Array.from(relMap.keys());
      const teams = (await TeamModel.find({ uid: { $in: teamUids } }).lean()) as unknown as LeanTeamDocument[];

      const populatedTeams = teams.map(team => ({
        ...team,
        isInvitation: relMap.get(team.uid) === 'INVITED_TO',
        members: memberMap.get(team.uid) || [],
        invitations: invitationMap.get(team.uid) || []
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
export const getCachedTeamDetails = (
  teamIdentifier: string, 
  userUid: string, 
  getCapabilitiesFn: (userUid: string, teamUid: string) => Promise<unknown> | unknown
) => {
  return unstable_cache(
    async () => {
      const team = await TeamModel.findOne({
        $or: [{ slug: teamIdentifier }, { uid: teamIdentifier }]
      }).lean() as unknown as LeanTeamDocument | null;

      if (!team) return null;
      
      const teamUid = team.uid;
      const caps = await getCapabilitiesFn(userUid, teamUid);
      const neoSession = getNeo4jSession();
      let invitations: TeamInvitation[] = [];
      
      try {
        if (neoSession) {
          const inviteCypher = `
            MATCH (target:User)-[r:INVITED_TO|REFUSED_INVITATION]->(t:Team {uid: $teamUid})
            RETURN target.uid AS uid, target.pseudo AS pseudo, type(r) AS relType
          `;
          const inviteResult = await neoSession.run(inviteCypher, { teamUid });
          invitations = inviteResult.records.map((record: Neo4jRecord): TeamInvitation => ({
            uid: record.get('uid') as string,
            pseudo: record.get('pseudo') as string,
            status: record.get('relType') === 'INVITED_TO' ? 'PENDING' : 'REFUSED'
          }));
        }
      } catch (inviteErr: unknown) {
        console.error("  [INVITATIONS QUERY ERROR]", inviteErr);
      } finally {
        if (neoSession) {
          try { await neoSession.close(); } catch {}
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