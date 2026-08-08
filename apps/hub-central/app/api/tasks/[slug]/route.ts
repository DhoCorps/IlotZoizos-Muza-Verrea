import { NextResponse } from 'next/server';
import { TaskModel, getNeo4jSession } from '@ilot/infrastructure'; 
import { TaskOrchestrator } from '@ilot/shared-core';
import { CAPABILITIES, ActionSignature } from '@ilot/types';
import { slugify } from '@/lib/slugify';
import { unstable_cache, revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards'; // 🪡 Notre bouclier souverain strict

export const dynamic = 'force-dynamic';

/**
 * 🛡️ UTILITAIRE DE DOUANE (Spécifique à l'Atome)
 * Compile les droits (Ascendants via Projet + Directs via Tâche)
 */
async function getTaskCapabilities(userUid: string, taskUid: string): Promise<string[]> {
  const session = getNeo4jSession();
  try {
    const cypher = `
      MATCH (t:Task {uid: $taskUid})
      OPTIONAL MATCH (t)-[:TASK_OF]->(p:Project)
      
      // L'Oiseau est-il directement lié à l'Atome ?
      OPTIONAL MATCH (u1:User {uid: $userUid})-[rDirect:ASSIGNED_TO|CREATED]->(t)
      
      // A-t-il les pouvoirs sur le Chantier parent ?
      OPTIONAL MATCH (u2:User {uid: $userUid})-[rProj:CONTRIBUTES_TO|OWNER_OF]->(p)
      OPTIONAL MATCH (u2)-[rTeam:MEMBER_OF|OWNER_OF|INVITED_TO]->(tTeam:Team)-[:HAS_PROJECT]->(p)
      
      RETURN 
        rDirect IS NOT NULL AS isDirectlyInvolved,
        rProj.capabilities AS projectCaps,
        tTeam.defaultProjectCapabilities AS teamDefaultCaps,
        type(rTeam) AS teamRel
    `;
    
    const result = await session.run(cypher, { userUid, taskUid });
    if (result.records.length === 0) return []; 

    const record = result.records[0];
    const isDirectlyInvolved = record.get('isDirectlyInvolved');
    const projectCaps = record.get('projectCaps') || [];
    const teamDefaultCaps = record.get('teamDefaultCaps') || [];
    const teamRel = record.get('teamRel');

    let compiledCaps = [...new Set([...projectCaps, ...teamDefaultCaps])];

    if (isDirectlyInvolved) {
        if (!compiledCaps.includes(CAPABILITIES.TASK.READ)) compiledCaps.push(CAPABILITIES.TASK.READ);
        if (!compiledCaps.includes(CAPABILITIES.TASK.UPDATE)) compiledCaps.push(CAPABILITIES.TASK.UPDATE);
        if (!compiledCaps.includes(CAPABILITIES.TASK.DELETE)) compiledCaps.push(CAPABILITIES.TASK.DELETE);
    }

    if (teamRel === 'INVITED_TO') {
        if (!compiledCaps.includes(CAPABILITIES.TASK.READ)) compiledCaps.push(CAPABILITIES.TASK.READ);
    }

    return compiledCaps;
  } catch (error) {
    console.error("🔥 Fracture lors de la compilation d'Aura sur l'Atome :", error);
    return [];
  } finally {
    await session.close();
  }
}

// 🧠 CACHE : Récupération et auscultation d'un atome spécifique
const getCachedTaskDetails = (taskId: string, userUid: string) => {
  return unstable_cache(
    async () => {
      const task = await TaskModel.findOne({ uid: taskId }).lean();
      if (!task) return null;

      const caps = await getTaskCapabilities(userUid, taskId);
      return { task, caps };
    },
    [`task-details-${taskId}-${userUid}`],
    { revalidate: 60, tags: ['tasks', `task-${taskId}`] }
  )();
};

// ==========================================
// 🔍 GET : Ausculter un Atome spécifique
// ==========================================
export const GET = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  const resolvedParams = await context.params;
  const rawSlug = resolvedParams?.slug;
  const taskId = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

  const data = await getCachedTaskDetails(taskId, currentUser.uid);
  if (!data || !data.task) {
    return NextResponse.json({ error: "Atome non trouvé dans la silice." }, { status: 404 });
  }

  const { task, caps } = data;

  if (!caps.includes(CAPABILITIES.TASK.READ) && !currentUser.capabilities?.includes('*')) {
      return NextResponse.json({ error: "L'accès à cet Atome t'est refusé." }, { status: 403 });
  }

  return NextResponse.json({ ...task, myCapabilities: caps }, { status: 200 });
});

// ==========================================
// 🚀 POST : Actions sur un Atome (Sous-tâche / Matrioshka)
// ==========================================
export const POST = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  const resolvedParams = await context.params;
  const rawSlug = resolvedParams?.slug;
  const taskId = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

  const caps = await getTaskCapabilities(currentUser.uid, taskId);

  if (!caps.includes(CAPABILITIES.TASK.UPDATE) && !currentUser.capabilities?.includes('*')) {
      return NextResponse.json({ error: "Aura insuffisante pour agir sur cet Atome." }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch (parseErr) {
    return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
  }

  const { action, data } = body;
  const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: caps
  };

  if (action === 'CREATE_SUBTASK') {
    try {
      const taskOrch = new TaskOrchestrator();
      const newSubTask = await taskOrch.fosterTask({
        ...data,
        parentUid: taskId
      }, signature);

      // 💥 Invalidation du cache
      revalidateTag('tasks');
      revalidateTag(`task-${taskId}`);

      return NextResponse.json(newSubTask, { status: 201 });
    } catch (orchErr: any) {
      console.error("🌋 [TASK ORCHESTRATOR SUBTASK ERROR]", orchErr);
      const status = orchErr.statusCode || orchErr.status || 500;
      return NextResponse.json({ error: orchErr.message || "Échec de fondation de sous-atome." }, { status });
    }
  }

  return NextResponse.json({ error: "Mouvement inconnu sur cet Atome." }, { status: 400 });
});

// ==========================================
// 🛠️ PATCH : Mutation d'un Atome
// ==========================================
export const PATCH = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  const resolvedParams = await context.params;
  const rawSlug = resolvedParams?.slug;
  const taskId = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

  const caps = await getTaskCapabilities(currentUser.uid, taskId);

  if (!caps.includes(CAPABILITIES.TASK.UPDATE) && !currentUser.capabilities?.includes('*')) {
      return NextResponse.json({ error: "Tu ne peux pas faire muter cet Atome." }, { status: 403 });
  }

  const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: caps
  };

  let body;
  try {
    body = await req.json();
  } catch (parseErr) {
    return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
  }

  let updatedTask;
  try {
    const taskOrch = new TaskOrchestrator(); 
    updatedTask = await taskOrch.updateTask(taskId, body, signature);
  } catch (orchErr: any) {
    console.error("🌋 [TASK ORCHESTRATOR UPDATE ERROR]", orchErr);
    const status = orchErr.statusCode || orchErr.status || 500;
    return NextResponse.json({ error: orchErr.message || "Échec de la mutation de l'Atome." }, { status });
  }

  // 💥 Invalidation du cache
  revalidateTag('tasks');
  revalidateTag(`task-${taskId}`);

  return NextResponse.json(updatedTask, { status: 200 });
});

// ==========================================
// 🗑️ DELETE : Désintégration d'un Atome
// ==========================================
export const DELETE = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  const resolvedParams = await context.params;
  const rawSlug = resolvedParams?.slug;
  const taskId = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

  const caps = await getTaskCapabilities(currentUser.uid, taskId);

  if (!caps.includes(CAPABILITIES.TASK.DELETE) && !currentUser.capabilities?.includes('*')) {
      return NextResponse.json({ error: "La désintégration de cet Atome requiert plus d'aura." }, { status: 403 });
  }

  const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: caps
  };

  try {
    const taskOrch = new TaskOrchestrator(); 
    await taskOrch.disintegrateTask(taskId, signature);
  } catch (orchErr: any) {
    console.error("🌋 [TASK ORCHESTRATOR DISINTEGRATE ERROR]", orchErr);
    const status = orchErr.statusCode || orchErr.status || 500;
    return NextResponse.json({ error: orchErr.message || "Échec du rituel de désintégration." }, { status });
  }
  
  // 💥 Invalidation du cache
  revalidateTag('tasks');
  revalidateTag(`task-${taskId}`);

  return NextResponse.json({ message: "Atome rendu à la poussière du Nexus." }, { status: 200 });
});