// apps/hub-central/app/api/projects/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth"; 
import { ProjectOrchestrator } from '@ilot/shared-core'; 
import { ProjectModel } from '@ilot/infrastructure/src/database/models/nosql/project.model';
import { getNeo4jSession, connectToDatabase } from '@ilot/infrastructure'; 
import { CAPABILITIES, ActionSignature } from '@ilot/types';

/**
 * 🛠️ UTILITAIRE : Générateur de Slug
 */
function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

/**
 * 📂 GET : La Clairière (Récupérer les Chantiers)
 * Récupère les projets accessibles via des liens directs ou via l'appartenance à un Nid.
 */
export async function GET(req: Request) {
  try {
    await connectToDatabase();

    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;
    
    const { searchParams } = new URL(req.url);
    const requestedOwnerUid = searchParams.get('ownerId'); 

    let myProjectUids: string[] = [];
    
    if (userUid) {
      const neo4jSession = getNeo4jSession();
      try {
        // 🪡 SUTURE EVOLUÉE : On inclut les Nids où l'oiseau est invité [:INVITED_TO] pour lui donner la visibilité
        const cypher = `
          MATCH (u:User {uid: $userUid})
          OPTIONAL MATCH (u)-[:CONTRIBUTES_TO|OWNER_OF]->(pDirect:Project)
          OPTIONAL MATCH (u)-[:MEMBER_OF|INVITED_TO]->(t:Team)-[:HAS_PROJECT]->(pTeam:Project)
          WITH collect(pDirect.uid) + collect(pTeam.uid) AS allUids
          UNWIND allUids AS uid
          RETURN DISTINCT uid
        `;
        const result = await neo4jSession.run(cypher, { userUid });
        myProjectUids = result.records
          .map(record => record.get('uid'))
          .filter(id => id !== null);
      } finally {
        await neo4jSession.close();
      }
    }

    // 🛡️ SÉCURITÉ : Filtre MongoDB pour la visibilité
    let queryFilter: any = { 
      $or: [
        { visibility: { $in: ['PUBLIC', 'OPEN_SOURCE'] } }, 
        { uid: { $in: myProjectUids } }
      ]
    };

    // Si un propriétaire (Nid) spécifique est demandé, on affine le filtre
    if (requestedOwnerUid) {
      queryFilter = {
        $and: [
          { ownerUid: requestedOwnerUid },
          { $or: queryFilter.$or }
        ]
      };
    }

    const projectsFromMongo = await ProjectModel.find(queryFilter)
      .select('-moderation.internalNotes') 
      .sort({ 'dates.lastActivity': -1 })
      .limit(50)
      .lean();

    return NextResponse.json(projectsFromMongo);
  } catch (error: any) {
    console.error("🔥 Erreur de la Clairière (GET Projects):", error);
    return NextResponse.json({ error: "Le murmure s'est brisé dans la Clairière." }, { status: 500 });
  }
}

/**
 * 🌟 POST : Fondation d'un nouveau Chantier
 */
export async function POST(req: Request) {
  try {
    await connectToDatabase();

    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;
    const sessionCaps = (session?.user as any)?.capabilities || [];
    
    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    // 🛡️ DOUANE : Vérification des droits via la session (Vérité de la Silice)
    if (!sessionCaps.includes(CAPABILITIES.PROJECT.CREATE) && !sessionCaps.includes('*')) {
        return NextResponse.json({ error: "Aura insuffisante pour fonder un Chantier." }, { status: 403 });
    }

    const body = await req.json();

    // 🛡️ SUTURE : Forçage du slug pour éviter les erreurs de validation
    const projectData = { 
      ...body,
      slug: body.slug || (body.name ? slugify(body.name) : undefined)
    };

    if (!projectData.name) {
      return NextResponse.json({ error: "Le nom du Chantier est indispensable." }, { status: 400 });
    }

    if (!projectData.slug) {
       return NextResponse.json({ error: "Impossible de générer une signature URL (slug)." }, { status: 400 });
    }

    const signature: ActionSignature = {
        actorUid: userUid,
        capabilities: sessionCaps
    };

    const projectOrch = new ProjectOrchestrator(); 
    const result = await projectOrch.fosterProject(projectData, signature);

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    const status = error.statusCode || 500;
    console.error("❌ [NEXUS] Erreur de Fondation :", error.message);
    return NextResponse.json({ error: error.message || "L'Îlot repousse cette tentative de fondation." }, { status }); 
  }
}