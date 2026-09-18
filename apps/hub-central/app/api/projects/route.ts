export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { ProjectOrchestrator } from '@ilot/shared-core';
import { getNeo4jSession } from '@ilot/infrastructure';
import { CAPABILITIES, ActionSignature } from '@ilot/types';
import { revalidateTag } from 'next/cache';
import { withAura, withOptionalAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { getCachedProjects } from '@/lib/cache/projects.cache';
import { z } from 'zod';
import type { Session, QueryResult } from 'neo4j-driver';

// 🛡️ Schéma de validation Zod pour la fondation d'un Chantier
const CreateProjectSchema = z.object({
  name: z.string().min(1, "Le nom du Chantier est indispensable."),
  slug: z.string().optional(),
  description: z.string().optional(),
  visibility: z.string().optional(),
  ownerUid: z.string().optional(),
}).passthrough();

function slugify(text: string): string {
  return text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-');
}

// ==========================================
// GET : La Clairière (Lister les Projets)
// ==========================================
export const GET = withOptionalAura(async (req: NextRequest, _context: ApiContext, currentUser?: OiseauUser) => {
  try {
    let url: URL;
    try {
      url = new URL(req.url);
    } catch {
      return NextResponse.json({ error: "URL de requête invalide." }, { status: 400 });
    }
          
    const requestedOwnerUid = url.searchParams.get('ownerId') || undefined; 
    const userUid = currentUser?.uid;
    let myProjectUids: string[] = [];
    
    if (userUid) {
      let neo4jSession: Session | null = null;
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
        const result = (await neo4jSession.run(cypher, { userUid })) as QueryResult;
        myProjectUids = result.records
          .map((record: Record<string, unknown> | any) => record.get('uid'))
          .filter((id: unknown): id is string => typeof id === 'string');
      } catch (neoErr: unknown) {
        console.error("  [NEO4J ERROR PROJECTS GET]", neoErr);
      } finally {
        if (neo4jSession) {
          try {
            await neo4jSession.close();
          } catch (closeErr) {
            console.error("  Neo4j Session Close Error:", closeErr);
          }
        }
      }
    }
    
    const projects = await getCachedProjects(userUid, requestedOwnerUid, myProjectUids);
    return NextResponse.json(projects, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, 'PROJECTS GET ERROR');
  }
});

// ==========================================
// POST : Fondation d'un Chantier
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const sessionCaps = currentUser.capabilities || [];
    if (!sessionCaps.includes(CAPABILITIES.PROJECT.CREATE) && !sessionCaps.includes('*')) {
      return NextResponse.json({ error: "Aura insuffisante pour fonder un Chantier." }, { status: 403 });
    }
    
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    const validationResult = CreateProjectSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ error: "Paramètres invalides.", details: validationResult.error.flatten() }, { status: 400 });
    }

    const validatedData = validationResult.data;
    const finalSlug = validatedData.slug || slugify(validatedData.name);
    
    if (!finalSlug) {
      return NextResponse.json({ error: "Impossible de gérer une signature URL (slug)." }, { status: 400 });
    }

    const projectData = {
      ...validatedData,
      slug: finalSlug
    };
    
    const signature: ActionSignature = { actorUid: currentUser.uid, capabilities: sessionCaps };
    let result: unknown;
    try {
      const projectOrch = new ProjectOrchestrator();
      result = await projectOrch.fosterProject(projectData as any, signature);
    } catch (orchErr: unknown) {
      const err = orchErr as { status?: number; statusCode?: number; message?: string };
      console.error("  [PROJECT ORCHESTRATOR ERROR POST]", err);
      const status = err.statusCode || err.status || 500;
      return NextResponse.json({ error: err.message || "L'îlot repousse cette tentative." }, { status });
    }
    
    revalidateTag('projects');
    revalidateTag(`projects-user-${currentUser.uid}`);
    revalidateTag(`projects-user-public`);
    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    return handleRouteError(error, 'PROJECTS POST ERROR');
  }
});