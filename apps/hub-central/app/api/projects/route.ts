// Fichier : app/api/projects/route.ts
import { NextResponse } from 'next/server';
import { ProjectOrchestrator } from '@ilot/shared-core';
import { ProjectModel, getNeo4jSession } from '@ilot/infrastructure';
import { CAPABILITIES, ActionSignature } from '@ilot/types';
import { revalidateTag } from 'next/cache';
import { withAura, withOptionalAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { getCachedProjects } from '@/lib/cache/projects.cache';

function slugify(text: string) {
  return text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-');
}

export const dynamic = 'force-dynamic';

// ==========================================
// GET : La Clairière (Lister les Projets)
// ==========================================
export const GET = withOptionalAura(async (req: Request, _context: ApiContext, currentUser?: OiseauUser) => {
  try {
    let url;
    try {
      url = new URL(req.url);
    } catch (err) {
      return NextResponse.json({ error: "URL de requête invalide." }, { status: 400 });
    }
         
    const requestedOwnerUid = url.searchParams.get('ownerId') || undefined; 
    const userUid = currentUser?.uid;
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
        myProjectUids = result.records
          .map((record: { get: (key: string) => unknown }) => record.get('uid'))
          .filter((id: unknown): id is string => typeof id === 'string');
      } catch (neoErr: unknown) {
        console.error("  [NEO4J ERROR PROJECTS GET]", neoErr);
      } finally {
        if (neo4jSession) await neo4jSession.close();
      }
    }
    
    const projects = await getCachedProjects(userUid, requestedOwnerUid, myProjectUids);
    return NextResponse.json(projects, { status: 200 });
  } catch (error: any) {
    console.error("  Erreur globale GET Projects:", error);
    return NextResponse.json({ error: "Erreur interne globale." }, { status: 500 });
  }
});

// ==========================================
// POST : Fondation d'un Chantier
// ==========================================
export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const sessionCaps = currentUser.capabilities || [];
    if (!sessionCaps.includes(CAPABILITIES.PROJECT.CREATE) && !sessionCaps.includes('*')) {
      return NextResponse.json({ error: "Aura insuffisante pour fonder un Chantier." }, { status: 403 });
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
    if (!projectData.slug) return NextResponse.json({ error: "Impossible de gérer une signature URL (slug)." }, { status: 400 });
    
    const signature: ActionSignature = { actorUid: currentUser.uid, capabilities: sessionCaps };
    let result;
    try {
      const projectOrch = new ProjectOrchestrator();
      result = await projectOrch.fosterProject(projectData, signature);
    } catch (orchErr: any) {
      console.error("  [PROJECT ORCHESTRATOR ERROR POST]", orchErr);
      const status = orchErr.statusCode || orchErr.status || 500;
      return NextResponse.json({ error: orchErr.message || "L'îlot repousse cette tentative." }, { status });
    }
    
    revalidateTag('projects');
    revalidateTag(`projects-user-${currentUser.uid}`);
    revalidateTag(`projects-user-public`);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("  Erreur globale POST Projects:", error);
    return NextResponse.json({ error: "Erreur interne globale." }, { status: 500 });
  }
});