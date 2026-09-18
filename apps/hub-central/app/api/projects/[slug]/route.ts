export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { ProjectOrchestrator } from '@ilot/shared-core';
import { ProjectModel, findEntityBySlugOrUid, getNeo4jSession } from '@ilot/infrastructure';
import { CAPABILITIES, ActionSignature } from '@ilot/types';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, withOptionalAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { getCachedProjectDetails } from '@/lib/cache/projects.cache';
import { z } from 'zod';
import type { Session, QueryResult } from 'neo4j-driver';

// 🛡️ Schéma Zod pour sécuriser les mutations de projets (PUT)
const UpdateProjectSchema = z.object({
  name: z.string().min(1, "Le nom du chantier est requis.").optional(),
  status: z.string().optional(),
  visibility: z.string().optional(),
  newFiles: z.array(z.string()).optional(),
}).passthrough(); // Autorise d'autres champs libres propres au modèle

interface IProjectEntity {
  uid: string;
  slug?: string;
  visibility?: string;
  creatorUid?: string;
  [key: string]: unknown;
}

async function getProjectCapabilities(userUid: string | undefined, projectUid: string): Promise<{ hasAccess: boolean; capabilities: string[] }> {
  if (!userUid) return { hasAccess: false, capabilities: [] };
  
  // ✅ Utilisation directe du type Session natif de neo4j-driver
  const session: Session = getNeo4jSession();
  try {
    const result = (await session.run(
      `MATCH (u:User {uid: $userUid})
       OPTIONAL MATCH (u)-[rDirect:CONTRIBUTES_TO|OWNER_OF]->(p:Project {uid: $projectUid})
       OPTIONAL MATCH (u)-[rTeam:MEMBER_OF|OWNER_OF|INVITED_TO]->(t:Team)-[:HAS_PROJECT]->(p:Project {uid: $projectUid})
       WITH collect(rDirect.capabilities) + collect(rTeam.capabilities) AS compiledCaps,
            collect(type(rTeam)) AS relTypes
       RETURN DISTINCT compiledCaps, relTypes`,
      { userUid, projectUid }
    )) as QueryResult;
    
    if (!result || !result.records || result.records.length === 0) return { hasAccess: false, capabilities: [] };
    
    const record = result.records[0];
    const rawCompiledCaps = record.get('compiledCaps');
    const caps = (Array.isArray(rawCompiledCaps) ? rawCompiledCaps.flat() : []).filter(Boolean) as string[];
    const relTypes = (record.get('relTypes') as string[]) || [];
    
    if (caps.length === 0 && relTypes.length === 0) return { hasAccess: false, capabilities: [] };
    
    if (relTypes.includes('INVITED_TO')) {
      if (!caps.includes('project:read')) caps.push('project:read');
      if (!caps.includes('task:read')) caps.push('task:read');
    }
    
    return { hasAccess: true, capabilities: caps };
  } catch (err) {
    console.error("  Neo4j Capability Error:", err);
    return { hasAccess: false, capabilities: [] };
  } finally {
    // 🛡️ GARANTIE STRICTE : Fermeture native et propre de la session
    if (session) {
      try {
        await session.close();
      } catch (closeErr) {
        console.error("  Neo4j Session Close Error:", closeErr);
      }
    }
  }
}


// ==========================================
// GET : Ausculter un Chantier spécifique
// ==========================================
export const GET = withOptionalAura(async (req: NextRequest, context: ApiContext, currentUser?: OiseauUser) => {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const rawParam = resolvedParams?.slug ?? resolvedParams?.projectId;
    const rawProjectId = typeof rawParam === 'string'
       ? rawParam
       : Array.isArray(rawParam)
         ? rawParam[0]
         : '';
         
    const identifier = slugify(rawProjectId);
    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }
    
    let project = (await getCachedProjectDetails(identifier)) as IProjectEntity | null;
    if (!project) {
      project = (await findEntityBySlugOrUid(ProjectModel, identifier)) as IProjectEntity | null;
    }

    if (!project) {
      return NextResponse.json({ error: "Chantier introuvable." }, { status: 404 });
    }
    
    const userUid = currentUser?.uid;
    const sessionCaps = currentUser?.capabilities || [];
    const { hasAccess, capabilities } = await getProjectCapabilities(userUid, project.uid || identifier);
    const mergedCaps = [...new Set([...capabilities, ...sessionCaps])];
    const isPublic = project.visibility === 'PUBLIC' || project.visibility === 'OPEN_SOURCE';
    const hasReadPermission = mergedCaps.includes('project:read') || mergedCaps.includes('*') || project.creatorUid === userUid;
    
    if (!isPublic && !hasAccess && !hasReadPermission) {
      return NextResponse.json({ error: "Ce chantier est protégé. L'accès t'est refusé." }, { status: 403 });
    }
    return NextResponse.json({ ...project, myCapabilities: mergedCaps }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, 'PROJECT GET ERROR');
  }
});

// ==========================================
// PUT : Mutation / Modification d'un Chantier
// ==========================================
export const PUT = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const rawParam = resolvedParams?.slug ?? resolvedParams?.projectId;
    const rawProjectId = typeof rawParam === 'string'
       ? rawParam
       : Array.isArray(rawParam)
         ? rawParam[0]
         : '';
         
    const identifier = slugify(rawProjectId);
    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }
    
    const userUid = currentUser.uid;
    const sessionCaps = currentUser.capabilities || [];
    
    const projectCheck = (await findEntityBySlugOrUid(ProjectModel, identifier)) as IProjectEntity | null;
    const targetUid = projectCheck?.uid || identifier;

    const { capabilities } = await getProjectCapabilities(userUid, targetUid);
    const mergedCaps = [...new Set([...capabilities, ...sessionCaps])];
         
    const isCreator = projectCheck?.creatorUid === userUid;
    const canUpdate = mergedCaps.includes(CAPABILITIES.SYSTEM.ALL) || mergedCaps.includes(CAPABILITIES.PROJECT.UPDATE) || mergedCaps.includes('*') || isCreator;
         
    if (!canUpdate) {
      return NextResponse.json({ error: "Tu n'as pas l'aura requise pour muter ce Chantier." }, { status: 403 });
    }
    
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
    }

    const validationResult = UpdateProjectSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ error: "Paramètres de mutation invalides.", details: validationResult.error.flatten() }, { status: 400 });
    }

    const validatedData = validationResult.data;
    
    const signature: ActionSignature = { actorUid: userUid, capabilities: mergedCaps };
    let updatedProject: unknown;
    try {
      const projectOrch = new ProjectOrchestrator();
      if (validatedData.newFiles && Array.isArray(validatedData.newFiles)) {
        await projectOrch.appendFiles(targetUid, validatedData.newFiles, signature);
        delete validatedData.newFiles;
      }
      updatedProject = await projectOrch.mutateProject(targetUid, validatedData, signature);
    } catch (orchErr: unknown) {
      const err = orchErr as { status?: number; statusCode?: number; message?: string };
      return NextResponse.json({ error: err.message || "Impossible de muter le projet." }, { status: err.statusCode || err.status || 500 });
    }
    
    revalidateTag('projects');
    revalidateTag(`project-${identifier}`);
    if (projectCheck?.uid) {
      revalidateTag(`project-${projectCheck.uid}`);
    }
    if (projectCheck?.slug) {
      revalidateTag(`project-${projectCheck.slug}`);
    }

    return NextResponse.json(updatedProject, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, 'PROJECT PUT ERROR');
  }
});

// ==========================================
// DELETE : Dissolution / Suppression d'un Chantier
// ==========================================
export const DELETE = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const rawParam = resolvedParams?.slug ?? resolvedParams?.projectId;
    const rawProjectId = typeof rawParam === 'string'
       ? rawParam
       : Array.isArray(rawParam)
         ? rawParam[0]
         : '';
         
    const identifier = slugify(rawProjectId);
    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }
    
    const userUid = currentUser.uid;
    const sessionCaps = currentUser.capabilities || [];

    const projectCheck = (await findEntityBySlugOrUid(ProjectModel, identifier)) as IProjectEntity | null;
    const targetUid = projectCheck?.uid || identifier;

    const { capabilities } = await getProjectCapabilities(userUid, targetUid);
    const mergedCaps = [...new Set([...capabilities, ...sessionCaps])];
         
    const isCreator = projectCheck?.creatorUid === userUid;
    const canDelete = mergedCaps.includes(CAPABILITIES.SYSTEM.ALL) || mergedCaps.includes(CAPABILITIES.PROJECT.DELETE) || mergedCaps.includes('*') || isCreator;
    
    if (!canDelete) {
      return NextResponse.json({ error: "Seul l'Architecte possède l'aura de dissolution." }, { status: 403 });
    }
    
    const signature: ActionSignature = { actorUid: userUid, capabilities: mergedCaps };
    try {
      const projectOrch = new ProjectOrchestrator();
      await projectOrch.dissolveProject(targetUid, signature);
    } catch (orchErr: unknown) {
      const err = orchErr as { status?: number; statusCode?: number; message?: string };
      return NextResponse.json({ error: err.message || "Le rituel a échoué." }, { status: err.statusCode || err.status || 500 });
    }
         
    revalidateTag('projects');
    revalidateTag(`project-${identifier}`);
    if (projectCheck?.uid) {
      revalidateTag(`project-${projectCheck.uid}`);
    }
    if (projectCheck?.slug) {
      revalidateTag(`project-${projectCheck.slug}`);
    }

    return NextResponse.json({ message: "L'œuvre est retournée au silence.", status: "dissolved" }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, 'PROJECT DELETE ERROR');
  }
});