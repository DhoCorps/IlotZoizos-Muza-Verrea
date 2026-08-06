import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth"; 
import { ProjectOrchestrator } from '@ilot/shared-core'; 
import { ProjectModel, getNeo4jSession, connectToDatabase } from '@ilot/infrastructure'; 
import { CAPABILITIES, ActionSignature } from '@ilot/types';

function slugify(text: string) {
  return text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-');
}

export async function GET(req: Request) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR PROJECTS GET]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR PROJECTS GET]", sessionErr);
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    const userUid = (session?.user as any)?.uid;
    
    let url;
    try {
      url = new URL(req.url);
    } catch (err) {
      return NextResponse.json({ error: "URL de requête invalide." }, { status: 400 });
    }
    
    const requestedOwnerUid = url.searchParams.get('ownerId'); 

    let myProjectUids: string[] = [];
    if (userUid) {
      let neo4jSession;
      try {
        neo4jSession = getNeo4jSession();
        const cypher = `
          MATCH (u:User {uid: $userUid})
          OPTIONAL MATCH (u)-[:CONTRIBUTES_TO|OWNER_OF]->(pDirect:Project)
          OPTIONAL MATCH (u)-[:MEMBER_OF|INVITED_TO]->(t:Team)-[:HAS_PROJECT]->(pTeam:Project)
          WITH collect(pDirect.uid) + collect(pTeam.uid) AS allUids
          UNWIND allUids AS uid
          RETURN DISTINCT uid
        `;
        const result = await neo4jSession.run(cypher, { userUid });
        myProjectUids = result.records.map(record => record.get('uid')).filter(id => id !== null);
      } catch (neoErr) {
        console.error("🔥 [NEO4J ERROR PROJECTS GET]", neoErr);
        // On continue même si Neo4j échoue (résilience), on verra au moins les projets publics
      } finally {
        if (neo4jSession) await neo4jSession.close();
      }
    }

    let queryFilter: any = { 
      $or: [
        { visibility: { $in: ['PUBLIC', 'OPEN_SOURCE'] } }, 
        { uid: { $in: myProjectUids } }
      ]
    };

    if (requestedOwnerUid) {
      queryFilter = {
        $and: [
          { ownerUid: requestedOwnerUid },
          { $or: queryFilter.$or }
        ]
      };
    }

    let projectsFromMongo;
    try {
      projectsFromMongo = await ProjectModel.find(queryFilter)
        .select('-moderation.internalNotes') 
        .sort({ 'dates.lastActivity': -1 })
        .limit(50)
        .lean();
    } catch (queryErr) {
      console.error("🔥 [PROJECTS QUERY ERROR]", queryErr);
      return NextResponse.json({ error: "Le murmure s'est brisé dans la Clairière." }, { status: 500 });
    }

    return NextResponse.json(projectsFromMongo, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale GET Projects:", error);
    return NextResponse.json({ error: "Erreur interne globale." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    const userUid = (session?.user as any)?.uid;
    const sessionCaps = (session?.user as any)?.capabilities || [];
    
    if (!userUid) return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });

    if (!sessionCaps.includes(CAPABILITIES.PROJECT.CREATE) && !sessionCaps.includes('*')) {
        return NextResponse.json({ error: "Aura insuffisante pour fonder un Chantier." }, { status: 403 });
    }

    try {
      await connectToDatabase();
    } catch (dbErr) {
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let body;
    try {
      body = await req.json();
    } catch (err) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    const projectData = { 
      ...body,
      slug: body.slug || (body.name ? slugify(body.name) : undefined)
    };

    if (!projectData.name) return NextResponse.json({ error: "Le nom du Chantier est indispensable." }, { status: 400 });
    if (!projectData.slug) return NextResponse.json({ error: "Impossible de générer une signature URL (slug)." }, { status: 400 });

    const signature: ActionSignature = { actorUid: userUid, capabilities: sessionCaps };
    
    let result;
    try {
      const projectOrch = new ProjectOrchestrator(); 
      result = await projectOrch.fosterProject(projectData, signature);
    } catch (orchErr: any) {
      console.error("❌ [PROJECT ORCHESTRATOR ERROR POST]", orchErr);
      const status = orchErr.statusCode || 500;
      return NextResponse.json({ error: orchErr.message || "L'Îlot repousse cette tentative." }, { status });
    }

    return NextResponse.json(result, { status: 201 });

  } catch (error: any) {
    console.error("🔥 Erreur globale POST Projects:", error);
    return NextResponse.json({ error: "Erreur interne globale." }, { status: 500 });
  }
}