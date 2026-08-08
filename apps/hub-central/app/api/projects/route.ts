export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ProjectOrchestrator } from '@ilot/shared-core';
import { ProjectModel, getNeo4jSession } from '@ilot/infrastructure';
import { CAPABILITIES, ActionSignature } from '@ilot/types';
import { unstable_cache, revalidateTag } from 'next/cache';
import { withAura, withOptionalAura, OiseauUser, ApiContext } from '@/lib/api-guards';

function slugify(text: string) {
  return text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-');
}

// 🧠 CACHE : Récupération des projets optimisée
const getCachedProjects = (userUid?: string, requestedOwnerUid?: string, myProjectUids: string[] = []) => {
  return unstable_cache(
    async () => {
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

      return await ProjectModel.find(queryFilter)
        .select('-moderation.internalNotes') 
        .sort({ 'dates.lastActivity': -1 })
        .limit(50)
        .lean();
    },
    [`projects-list-${userUid || 'public'}-${requestedOwnerUid || 'all'}-${myProjectUids.join(',')}`],
    { revalidate: 60, tags: ['projects', `projects-user-${userUid || 'public'}`] }
  )();
};

// ==========================================
// 🔍 GET : La Clairière (Lister les Projets - Public / Optionnel Aura)
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
      
      let myProjectUids: string[] = [];

      try {
        const result = await neo4jSession.run(cypher, { userUid });
        
        myProjectUids = result.records
          .map((record: { get: (key: string) => unknown }) => record.get('uid'))
          .filter((id: unknown): id is string => typeof id === 'string'); // 👈 Typé en unknown

      } catch (neoErr: unknown) { // 👈 Déclaré proprement dans le catch
        console.error("🔥 [NEO4J ERROR PROJECTS GET]", neoErr);
      }
      } finally {
        if (neo4jSession) await neo4jSession.close();
      }
    }

    const projects = await getCachedProjects(userUid, requestedOwnerUid, myProjectUids);

    return NextResponse.json(projects, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale GET Projects:", error);
    return NextResponse.json({ error: "Erreur interne globale." }, { status: 500 });
  }
});

// ==========================================
// 🚀 POST : Fondation d'un Chantier (Strictement Privé / Aura + Capabilities)
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
    if (!projectData.slug) return NextResponse.json({ error: "Impossible de générer une signature URL (slug)." }, { status: 400 });

    const signature: ActionSignature = { actorUid: currentUser.uid, capabilities: sessionCaps };
    
    let result;
    try {
      const projectOrch = new ProjectOrchestrator(); 
      result = await projectOrch.fosterProject(projectData, signature);
    } catch (orchErr: any) {
      console.error("❌ [PROJECT ORCHESTRATOR ERROR POST]", orchErr);
      const status = orchErr.statusCode || orchErr.status || 500;
      return NextResponse.json({ error: orchErr.message || "L'Îlot repousse cette tentative." }, { status });
    }

    // 💥 BOOM ! Invalidation chirurgicale du cache des projets
    revalidateTag('projects');
    revalidateTag(`projects-user-${currentUser.uid}`);
    revalidateTag(`projects-user-public`);

    return NextResponse.json(result, { status: 201 });

  } catch (error: any) {
    console.error("🔥 Erreur globale POST Projects:", error);
    return NextResponse.json({ error: "Erreur interne globale." }, { status: 500 });
  }
});