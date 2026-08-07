import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { TeamModel, getNeo4jSession, connectToDatabase } from "@ilot/infrastructure"; 
import { TeamOrchestrator } from "@ilot/shared-core";
import { TeamSchema, CAPABILITIES, ActionSignature } from "@ilot/types";
import { Record } from 'neo4j-driver';

// ==========================================
// 🔍 GET : Recensement des Nids de l'Oiseau
// ==========================================
export async function GET(req: Request) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR TEAMS GET]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR TEAMS GET]", sessionErr);
      return NextResponse.json({ error: "Erreur de lecture d'Aura." }, { status: 500 });
    }

    if (!session || !session.user || !(session.user as any).uid) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userUid = (session.user as any).uid;

    const neo4jSession = getNeo4jSession();
    const relMap = new Map<string, string>();
    const memberMap = new Map<string, any[]>();
    const invitationMap = new Map<string, any[]>();
    
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
        const invitations = result.records.map((record: Record) => ({
          uid: record.get('uid'),
          pseudo: record.get('pseudo'),
          status: record.get('relType') === 'INVITED_TO' ? 'PENDING' : 'REFUSED'
        }));
        invitationMap.set(tUid, invitations);
      }
    } catch (neoErr) {
      console.error("🔥 [NEO4J TEAMS GRAPH ERROR]", neoErr);
      return NextResponse.json({ error: "Le Graphe est momentanément muet." }, { status: 500 });
    } finally {
      if (neo4jSession) {
        try {
          await neo4jSession.close();
        } catch (closeErr) {}
      }
    }

    const teamUids = Array.from(relMap.keys());
    if (teamUids.length === 0) return NextResponse.json([], { status: 200 });

    let teams;
    try {
      teams = await TeamModel.find({ uid: { $in: teamUids } }).lean();
    } catch (mongoErr) {
      console.error("🔥 [MONGO TEAMS QUERY ERROR]", mongoErr);
      return NextResponse.json({ error: "Échec de lecture des Nids dans la Silice." }, { status: 500 });
    }

    const populatedTeams = teams.map(team => ({
      ...team,
      isInvitation: relMap.get(team.uid!) === 'INVITED_TO',
      members: memberMap.get(team.uid!) || [],
      invitations: invitationMap.get(team.uid!) || []
    }));

    const sanitizedTeams = populatedTeams.map(team => {
      const existingMemberUids = new Set(team.members.map(m => m.uid));
      
      if (!existingMemberUids.has(team.ownerUid)) {
        team.members.unshift({
          uid: team.ownerUid,
          pseudo: "L'Architecte (Fondateur)",
          signature: "Créateur"
        });
      } else {
        team.members = team.members.map(m => {
          if (m.uid === team.ownerUid && !m.pseudo) {
            return { ...m, pseudo: "L'Architecte (Fondateur)", signature: "Créateur" };
          }
          return m;
        });
      }
      return team;
    });

    return NextResponse.json(sanitizedTeams, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale lors de la récupération des Nids unifiés :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}

// ==========================================
// 📤 POST : Fonder une nouvelle escouade (Nid)
// ==========================================
export async function POST(request: Request) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR TEAMS POST]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR TEAMS POST]", sessionErr);
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    // 🛡️ VÉRIFICATION 401 IMPÉRATIVE EN PREMIER (AVANT TOUTE LECTURE DE CAPACITÉS)
    if (!session || !session.user || !(session.user as any).uid) {
      return NextResponse.json({ error: "Oiseau non identifié" }, { status: 401 });
    }

    const userUid = (session.user as any).uid;
    const sessionCaps = (session.user as any).capabilities || [];

    // 🛡️ VÉRIFICATION 403 DES DROITS EN SECOND
    const hasPermission = sessionCaps.includes(CAPABILITIES.TEAM.CREATE) || sessionCaps.includes('*');

    if (!hasPermission) {
        console.warn(`🚫 [Auth] Tentative de fondation sans droits par : ${userUid}`);
        return NextResponse.json({ 
          error: "Aura insuffisante pour fonder un Nid.",
          debug_plumes: sessionCaps 
        }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "L'onde est muette : Corps de requête invalide ou manquant." }, { status: 400 });
    }

    const creationSchema = TeamSchema.omit({ 
      uid: true, 
      ownerUid: true, 
      leaderUid: true 
    });

    const validated = creationSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ errors: validated.error.flatten() }, { status: 400 });
    }

    const signature: ActionSignature = {
        actorUid: userUid,
        capabilities: sessionCaps
    };

    let result;
    try {
      const teamEngine = new TeamOrchestrator();
      result = await teamEngine.fosterTeam({
        ...validated.data,
        ownerUid: userUid,
        leaderUid: userUid
      }, signature); 
    } catch (orchErr: any) {
      console.error("🌋 [TEAM ORCHESTRATOR FOSTER ERROR]", orchErr);
      const status = orchErr.statusCode || orchErr.status || 500;
      return NextResponse.json({ error: orchErr.message || "Échec de fondation du Nid." }, { status });
    }

    return NextResponse.json(result, { status: 201 });

  } catch (error: any) {
    console.error("🔥 Erreur globale de fondation :", error);
    const status = error.statusCode || error.status || 500;
    return NextResponse.json({ error: error.message || "Erreur lors de la fondation." }, { status });
  }
}