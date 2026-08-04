// apps/hub-central/app/api/teams/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { TeamModel, getNeo4jSession, connectToDatabase } from "@ilot/infrastructure"; 
import { TeamOrchestrator } from "@ilot/shared-core";
import { TeamSchema, CAPABILITIES, ActionSignature } from "@ilot/types";

/**
 * 🛡️ UTILITAIRE DE DOUANE (Neo4j)
 * Gardé pour référence ou vérifications croisées
 */
async function getGlobalCapabilities(userUid: string): Promise<string[]> {
  const session = getNeo4jSession();
  try {
    const result = await session.run(
      `MATCH (u:User {uid: $userUid})
       RETURN u.capabilities AS caps`, // 🪡 SUTURE : On change 'globalCapabilities' en 'capabilities'
      { userUid }
    );
    
    if (result.records.length === 0) return []; 
    return result.records[0].get('caps') || []; 
  } finally {
    await session.close();
  }
}

export async function GET(req: Request) {
  try {
    await connectToDatabase(); // Assurer l'éveil de la Silice

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userUid = (session as any).user.uid;

    // 1. Interroger la Gare Centrale (Neo4j) pour trouver tous les Nids de l'oiseau
    const neo4jSession = getNeo4jSession();
    const relMap = new Map<string, string>();
    const memberMap = new Map<string, any[]>();
    const invitationMap = new Map<string, any[]>(); // 🪡 SUTURE : Catalogue global des invitations
    
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

      // Pour chaque Nid, on extrait ses membres de manière STRICTEMENT UNIQUE
      for (const tUid of teamUids) {
        // 🪡 SUTURE CHIRURGICALE : L'ajout de DISTINCT élimine le doublon provoqué par la double relation FOUNDED + MEMBER_OF
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

        // Extraction des états d'invitations
        const inviteCypher = `
          MATCH (target:User)-[r:INVITED_TO|REFUSED_INVITATION]->(t:Team {uid: $tUid})
          RETURN DISTINCT target.uid AS uid, target.pseudo AS pseudo, type(r) AS relType
        `;
        const inviteResult = await neo4jSession.run(inviteCypher, { tUid });
        const invitations = inviteResult.records.map(record => ({
          uid: record.get('uid'),
          pseudo: record.get('pseudo'),
          status: record.get('relType') === 'INVITED_TO' ? 'PENDING' : 'REFUSED'
        }));
        invitationMap.set(tUid, invitations);
      }
    } finally {
      // ⚡ NETTOYAGE CRUCIAL : Sécurise la libération des ports Bolt
      await neo4jSession.close();
    }

    const teamUids = Array.from(relMap.keys());

    // 2. Extraire les documents correspondants depuis la Silice (MongoDB)
    const teams = await TeamModel.find({ uid: { $in: teamUids } }).lean();

    // Decorate chaque Nid avec son flag d'invitation, son tableau de membres et ses invitations de suivi
    const populatedTeams = teams.map(team => ({
      ...team,
      isInvitation: relMap.get(team.uid!) === 'INVITED_TO',
      members: memberMap.get(team.uid!) || [],
      invitations: invitationMap.get(team.uid!) || []
    }));

    // 🪡 SUTURE DE DÉDUPLICATION ABSOLUE
    const sanitizedTeams = populatedTeams.map(team => {
      const existingMemberUids = new Set(team.members.map(m => m.uid));
      
      // Si le créateur (ownerUid) n'est pas encore détecté par le Graphe ou possède un profil vide, on l'ajoute proprement
      if (!existingMemberUids.has(team.ownerUid)) {
        team.members.unshift({
          uid: team.ownerUid,
          pseudo: "L'Architecte (Fondateur)",
          signature: "Créateur"
        });
      } else {
        // Si le créateur existe déjà dans la liste mais que son pseudo est absent/fantôme, on harmonise son identité
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
    console.error("🔥 Erreur lors de la récupération des Nids unifiés :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * 📤 POST : Créer une escouade
 */
export async function POST(request: Request) {
  try {
    await connectToDatabase();

    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;
    
    const sessionCaps = (session?.user as any)?.capabilities || [];
    
    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié" }, { status: 401 });
    }

    // 🛡️ DOUANE : Vérification de l'Aura via la session
    const hasPermission = sessionCaps.includes(CAPABILITIES.TEAM.CREATE) || sessionCaps.includes('*');

    if (!hasPermission) {
        console.warn(`🚫 [Auth] Tentative de fondation sans droits par : ${userUid}`);
        return NextResponse.json({ 
          error: "Aura insuffisante pour fonder un Nid.",
          debug_plumes: sessionCaps 
        }, { status: 403 });
    }

    const signature: ActionSignature = {
        actorUid: userUid,
        capabilities: sessionCaps
    };

    const body = await request.json();

    // Validation du schéma
    const creationSchema = TeamSchema.omit({ 
      uid: true, 
      ownerUid: true, 
      leaderUid: true 
    });

    const validated = creationSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ errors: validated.error.flatten() }, { status: 400 });
    }

    const teamEngine = new TeamOrchestrator();

    // Fusion des données et fondation du Nid
    const result = await teamEngine.fosterTeam({
      ...validated.data,
      ownerUid: userUid,
      leaderUid: userUid
    }, signature); 

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("🔥 Erreur de fondation :", error);
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || "Erreur lors de la fondation." }, { status });
  }
}