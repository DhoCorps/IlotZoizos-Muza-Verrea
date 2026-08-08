export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ProjectOrchestrator } from '@ilot/shared-core';
import { ProjectModel, getNeo4jSession } from '@ilot/infrastructure';
import { CAPABILITIES, ActionSignature } from '@ilot/types';
import { unstable_cache, revalidateTag } from 'next/cache';
import { withAura, withOptionalAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// 🧠 Fonction d'évaluation des capacités dans le Graphe (Neo4j)
async function getProjectCapabilities(userUid: string | undefined, projectUid: string) {
  if (!userUid) return { hasAccess: false, capabilities: [] as string[] };
  const session = getNeo4jSession();
  try {
    const result = await session.run(
      `MATCH (u:User {uid: $userUid})
       OPTIONAL MATCH (u)-[rDirect:CONTRIBUTES_TO|OWNER_OF]->(p:Project {uid: $projectUid})
       OPTIONAL MATCH (u)-[rTeam:MEMBER_OF|OWNER_OF|INVITED_TO]->(t:Team)-[:HAS_PROJECT]->(p:Project {uid: $projectUid})
       WITH collect(rDirect.capabilities) + collect(rTeam.capabilities) AS compiledCaps, 
            collect(type(rTeam)) AS relTypes
       RETURN DISTINCT compiledCaps, relTypes`,
      { userUid, projectUid }
    );
    if (result.records.length === 0) return { hasAccess: false, capabilities: [] as string[] };
    const record = result.records[0];
    let caps = record.get('compiledCaps').flat().filter(Boolean) as string[];
    const relTypes = record.get('relTypes') as string[];
    if (caps.length === 0 && relTypes.length === 0) return { hasAccess: false, capabilities: [] as string[] };
    if (relTypes.includes('INVITED_TO')) {
      if (!caps.includes('project:read')) caps.push('project:read');
      if (!caps.includes('task:read')) caps.push('task:read');
    }
    return { hasAccess: true, capabilities: caps };
  } catch (err) {
    console.error("🔥 Neo4j Capability Error:", err);
    return { hasAccess: false, capabilities: [] as string[] };
  } finally {
    await session.close();
  }
}

// 🧠 CACHE : Récupération des détails d'un projet
const getCachedProjectDetails = (projectId: string) => {
  return unstable_cache(
    async () => {
      return await ProjectModel.findOne({ uid: projectId })
        .select('-moderation.internalNotes')
        .lean();
    },
    [`project-details-${projectId}`],
    { revalidate: 60, tags: ['projects', `project-${projectId}`] }
  )();
};

// ==========================================
// 🔍 GET : Ausculter un Chantier spécifique (Public / Optionnel Aura)
// ==========================================
export const GET = withOptionalAura(async (req: Request, context: ApiContext, currentUser?: OiseauUser) => {
  try {
    const resolvedParams = await context.params;
    const projectId = typeof resolvedParams?.projectId === 'string' 
      ? resolvedParams.projectId 
      : Array.isArray(resolvedParams?.projectId) 
        ? resolvedParams.projectId[0] 
        : '';

    if (!projectId) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    const project = await getCachedProjectDetails(projectId);
    if (!project) {
      return NextResponse.json({ error: "Chantier introuvable." }, { status: 404 });
    }

    const userUid = currentUser?.uid;
    const sessionCaps = currentUser?.capabilities || [];

    const { hasAccess, capabilities } = await getProjectCapabilities(userUid, projectId);
    const mergedCaps = [...new Set([...capabilities, ...sessionCaps])];

    const isPublic = project.visibility === 'PUBLIC' || project.visibility === 'OPEN_SOURCE';
    const hasReadPermission = mergedCaps.includes('project:read') || mergedCaps.includes('*') || project.creatorUid === userUid;

    if (!isPublic && !hasAccess && !hasReadPermission) {
      return NextResponse.json({ error: "Ce chantier est protégé. L'accès t'est refusé." }, { status: 403 });
    }

    return NextResponse.json({ ...project, myCapabilities: mergedCaps }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale GET Project:", error);
    return NextResponse.json({ error: "Erreur interne globale." }, { status: 500 });
  }
});

// ==========================================
// 🚀 PUT : Mutation / Modification d'un Chantier (Strictement Privé / Aura)
// ==========================================
export const PUT = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const resolvedParams = await context.params;
    const projectId = typeof resolvedParams?.projectId === 'string' 
      ? resolvedParams.projectId 
      : Array.isArray(resolvedParams?.projectId) 
        ? resolvedParams.projectId[0] 
        : '';

    if (!projectId) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    const userUid = currentUser.uid;
    const sessionCaps = currentUser.capabilities || [];
    const { capabilities } = await getProjectCapabilities(userUid, projectId);
    const mergedCaps = [...new Set([...capabilities, ...sessionCaps])];

    let projectCheck;
    try { 
      projectCheck = await ProjectModel.findOne({ uid: projectId }).lean(); 
    } catch(e) {}
    
    const isCreator = projectCheck?.creatorUid === userUid;
    const canUpdate = mergedCaps.includes(CAPABILITIES.SYSTEM.ALL) || mergedCaps.includes(CAPABILITIES.PROJECT.UPDATE) || mergedCaps.includes('*') || isCreator;
    
    if (!canUpdate) {
      return NextResponse.json({ error: "Tu n'as pas l'aura requise pour muter ce Chantier." }, { status: 403 });
    }

    let body;
    try { 
      body = await req.json(); 
    } catch (err) { 
      return NextResponse.json({ error: "Corps invalide." }, { status: 400 }); 
    }

    const signature: ActionSignature = { actorUid: userUid, capabilities: mergedCaps };
    let updatedProject;
    try {
      const projectOrch = new ProjectOrchestrator();
      if (body.newFiles && Array.isArray(body.newFiles)) {
        await projectOrch.appendFiles(projectId, body.newFiles, signature);
        delete body.newFiles; 
      }
      updatedProject = await projectOrch.mutateProject(projectId, body, signature);
    } catch (orchErr: any) {
      return NextResponse.json({ error: orchErr.message || "Impossible de muter le projet." }, { status: orchErr.statusCode || orchErr.status || 500 });
    }

    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade
    revalidateTag('projects');
    revalidateTag(`project-${projectId}`);

    return NextResponse.json(updatedProject, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale PUT Project:", error);
    return NextResponse.json({ error: "Erreur interne globale." }, { status: 500 });
  }
});

// ==========================================
// 🗑️ DELETE : Dissolution / Suppression d'un Chantier (Strictement Privé / Aura)
// ==========================================
export const DELETE = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const resolvedParams = await context.params;
    const projectId = typeof resolvedParams?.projectId === 'string' 
      ? resolvedParams.projectId 
      : Array.isArray(resolvedParams?.projectId) 
        ? resolvedParams.projectId[0] 
        : '';

    if (!projectId) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    const userUid = currentUser.uid;
    const sessionCaps = currentUser.capabilities || [];
    const { capabilities } = await getProjectCapabilities(userUid, projectId);
    const mergedCaps = [...new Set([...capabilities, ...sessionCaps])];

    let projectCheck;
    try { 
      projectCheck = await ProjectModel.findOne({ uid: projectId }).lean(); 
    } catch(e) {}
    
    const isCreator = projectCheck?.creatorUid === userUid;
    const canDelete = mergedCaps.includes(CAPABILITIES.SYSTEM.ALL) || mergedCaps.includes(CAPABILITIES.PROJECT.DELETE) || mergedCaps.includes('*') || isCreator;

    if (!canDelete) {
      return NextResponse.json({ error: "Seul l'Architecte possède l'aura de dissolution." }, { status: 403 });
    }

    const signature: ActionSignature = { actorUid: userUid, capabilities: mergedCaps };

    try {
      const projectOrch = new ProjectOrchestrator();
      await projectOrch.dissolveProject(projectId, signature);
    } catch (orchErr: any) {
      return NextResponse.json({ error: orchErr.message || "Le rituel a échoué." }, { status: orchErr.statusCode || orchErr.status || 500 });
    }
    
    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade
    revalidateTag('projects');
    revalidateTag(`project-${projectId}`);

    return NextResponse.json({ message: "L'œuvre est retournée au silence.", status: "dissolved" }, { status: 200 }); 

  } catch (error: any) {
    console.error("🔥 Erreur globale DELETE Project:", error);
    return NextResponse.json({ error: "Erreur interne globale." }, { status: 500 });
  }
});