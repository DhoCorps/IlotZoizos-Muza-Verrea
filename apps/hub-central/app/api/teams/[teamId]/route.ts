// apps/hub-central/app/api/teams/[teamId]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { TeamOrchestrator} from "@ilot/shared-core/src/sync-engine/team.orchestrator"; // ✅ Import de l'Orch ET de la Signature
import { getNeo4jSession, connectToDatabase, TeamModel } from '@ilot/infrastructure'; // 🪡 SUTURE : Intégration de la Silice pour le GET
import { CAPABILITIES, ActionSignature } from '@ilot/types'; 
import { authOptions } from "../../../../lib/auth"; // 🌟 SUTURE : La boussole d'Aura pour éclairer la Session

/**
 * 🛡️ UTILITAIRE DE DOUANE (Garde Frontière)
 * Interroge le Graphe Muet pour récupérer TOUTES les capacités de cet Oiseau sur ce Nid.
 * (Modifié pour inclure le fil d'or INVITED_TO et accorder le droit de lecture automatique)
 */
async function getCapabilities(userUid: string, teamUid: string): Promise<string[]> {
  const session = getNeo4jSession();
  try {
    const result = await session.run(
      `MATCH (u:User {uid: $userUid})-[r:MEMBER_OF|FOUNDED|INVITED_TO]->(t:Team {uid: $teamUid})
       RETURN r.capabilities AS caps, type(r) AS relType`,
      { userUid, teamUid }
    );
    
    if (result.records.length === 0) return []; // Zéro droits
    
    let compiledCaps: string[] = [];
    let isInvited = false;
    
    // 🪡 SUTURE MAJEURE : On parcourt l'intégralité des enregistrements pour fusionner tous les statuts
    result.records.forEach(record => {
      const caps = record.get('caps') || [];
      compiledCaps = [...compiledCaps, ...caps];
      if (record.get('relType') === 'INVITED_TO') {
        isInvited = true;
      }
    });
    
    // Élimination des doublons d'Aura
    let uniqueCaps = [...new Set(compiledCaps)];
    
    // 🌟 VISITEUR D'HONNEUR : Si l'oiseau est invité, on lui octroie le droit de regarder le Nid
    if (isInvited) {
      if (!uniqueCaps.includes(CAPABILITIES.TEAM.READ)) uniqueCaps.push(CAPABILITIES.TEAM.READ);
      if (!uniqueCaps.includes(CAPABILITIES.PROJECT.READ)) uniqueCaps.push(CAPABILITIES.PROJECT.READ);
    }
    
    return uniqueCaps;
  } finally {
    await session.close();
  }
}

// 🔍 GET : Découverte du Nid (Mode Consentement Éclairé)
export async function GET(req: Request, { params }: { params: { teamId: string } }) {
  try {
    await connectToDatabase();
    
    const session = await getServerSession(authOptions); 
    const userUid = (session?.user as any)?.uid;
    if (!userUid) return NextResponse.json({ error: "Oiseau non identifié" }, { status: 401 });

    const caps = await getCapabilities(userUid, params.teamId);
    
    if (!caps.includes(CAPABILITIES.TEAM.READ) && !caps.includes('*')) {
      return NextResponse.json({ error: "Ce territoire t'est inconnu. Accès refusé." }, { status: 403 });
    }

    const team = await TeamModel.findOne({ uid: params.teamId }).lean();
    if (!team) return NextResponse.json({ error: "Nid introuvable dans la silice." }, { status: 404 });

    // Hydratation contextuelle des capacités de l'appelant sur ce Nid
    return NextResponse.json({
      ...team,
      myCapabilities: caps
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 🏗️ ÉDITION DU NID (Mutation de structure)
export async function PUT(req: Request, { params }: { params: { teamId: string } }) {
  try {
    await connectToDatabase();
    
    // 1. Qui es-tu ? (Authentification éclairée par authOptions)
    const session = await getServerSession(authOptions); 
    const userUid = (session?.user as any)?.uid;
    if (!userUid) return NextResponse.json({ error: "Oiseau non identifié" }, { status: 401 });

    // 2. Que peux-tu faire ? (Récupération des droits)
    const caps = await getCapabilities(userUid, params.teamId);
    
    // Barrière rapide de la Douane (Front-End / Route)
    if (!caps.includes(CAPABILITIES.TEAM.UPDATE) && !caps.includes('*')) {
        return NextResponse.json({ error: "Tu n'as pas l'aura nécessaire pour modifier ce Nid." }, { status: 403 });
    }

    // 3. Fabrication de la Preuve (La Signature)
    const signature: ActionSignature = {
        actorUid: userUid,
        capabilities: caps
    };

    // 4. Action (Le Forgeron prend le relais)
    const body = await req.json();
    const teamEngine = new TeamOrchestrator(); // ✅ Instanciation propre (Voie 2)
    
    // On passe l'ID, les nouvelles données, ET la preuve
    const updatedTeam = await teamEngine.mutateTeam(params.teamId, body, signature);

    return NextResponse.json(updatedTeam);
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

// 🧨 DISSOLUTION DU NID (Effacement du Graphe et de la Silice)
export async function DELETE(req: Request, { params }: { params: { teamId: string } }) {
  try {
    await connectToDatabase();
    
    // 1. Qui es-tu ? (Authentification éclairée par authOptions)
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;
    if (!userUid) return NextResponse.json({ error: "Oiseau non identifié" }, { status: 401 });

    // 2. Que peux-tu faire ? (Récupération des droits)
    const caps = await getCapabilities(userUid, params.teamId);
    
    // Barrière rapide de la Douane
    if (!caps.includes(CAPABILITIES.TEAM.DELETE) && !caps.includes('*')) {
        return NextResponse.json({ error: "Seul l'Architecte de ce Nid peut le dissoudre." }, { status: 403 });
    }

    // 3. Fabrication de la Preuve (La Signature)
    const signature: ActionSignature = {
        actorUid: userUid,
        capabilities: caps
    };

    // 4. Action
    const teamEngine = new TeamOrchestrator(); // ✅ Instanciation propre
    
    // On passe l'ID ET la preuve au bourreau
    await teamEngine.dissolveTeam(params.teamId, signature);

  return NextResponse.json({ 
      message: "Le Nid a été dissous. Les oiseaux ont pris leur envol." 
    });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}