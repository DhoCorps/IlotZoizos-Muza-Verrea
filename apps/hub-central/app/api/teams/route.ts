// apps/hub-central/app/api/teams/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { TeamModel, getNeo4jSession, connectToDatabase } from "@ilot/infrastructure"; 
import { TeamOrchestrator } from "@ilot/shared-core/src/sync-engine/team.orchestrator";
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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userUid = (session as any).user.uid;

    // 1. Interroger la Gare Centrale (Neo4j) pour trouver tous les Nids de l'oiseau
    const neo4jSession = getNeo4jSession();
    const cypher = `
      MATCH (u:User {uid: $userUid})-[r:FOUNDED|MEMBER_OF|INVITED_TO]->(t:Team)
      RETURN t.uid AS teamUid
    `;
    
    const result = await neo4jSession.run(cypher, { userUid });
    const teamUids = result.records.map(record => record.get('teamUid'));

    // 2. Extraire les documents correspondants depuis la Silice (MongoDB)
    const teams = await TeamModel.find({ uid: { $in: teamUids } }).lean();

    return NextResponse.json(teams, { status: 200 });
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
    
    // 🪡 SUTURE : On récupère les plumes (droits) directement de la Session (MongoDB)
    // C'est ici que se soignait ton bug : on fait confiance à la Silice.
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
          debug_plumes: sessionCaps // Permet de voir tes droits dans la console Network si ça bloque
        }, { status: 403 });
    }

    const signature: ActionSignature = {
        actorUid: userUid,
        capabilities: sessionCaps
    };

    const body = await request.json();

    // 🛡️ SUTURE : Validation du schéma (en omettant les IDs auto-générés)
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