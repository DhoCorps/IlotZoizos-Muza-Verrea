import { NextResponse } from 'next/server';
import { getNeo4jSession, TaskModel, findEntityBySlugOrUid } from '@ilot/infrastructure'; 
import { TaskOrchestrator } from '@ilot/shared-core';
import { CAPABILITIES, ActionSignature } from '@ilot/types';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { getCachedTaskDetails } from '@/lib/cache/tasks.cache';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// ==========================================
// 🛡️ SCHÉMA DE VALIDATION ZOD (Anti Mass Assignment - PATCH / POST Subtask)
// ==========================================
const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  parentUid: z.string().optional().nullable(),
  assigneeUids: z.array(z.string()).optional(),
  pomoEst: z.number().optional(),
  complexity: z.number().optional(),
  dates: z.object({
    scheduledAt: z.string().optional(),
  }).optional(),
  connections: z.object({
    targetModule: z.string().optional(),
    targetEntityUid: z.string().optional(),
  }).optional(),
  documents: z.array(z.any()).optional(),
});

const SubTaskSchema = z.object({
  title: z.string().min(1, "Le titre de la sous-tâche est requis."),
  description: z.string().optional(),
  priority: z.string().optional(),
  assigneeUids: z.array(z.string()).optional(),
  pomoEst: z.number().optional(),
  complexity: z.number().optional(),
  dates: z.object({
    scheduledAt: z.string().optional(),
  }).optional(),
  connections: z.object({
    targetModule: z.string().optional(),
    targetEntityUid: z.string().optional(),
  }).optional(),
});

async function getTaskCapabilities(userUid: string, taskUid: string): Promise<string[]> {
  const session = getNeo4jSession();
  try {
    if (!session) return [];
         
    const cypher = `
      MATCH (t:Task {uid: $taskUid})
      OPTIONAL MATCH (t)-[:TASK_OF]->(p:Project)
      OPTIONAL MATCH (u1:User {uid: $userUid})-[rDirect:ASSIGNED_TO|CREATED]->(t)
      OPTIONAL MATCH (u2:User {uid: $userUid})-[rProj:CONTRIBUTES_TO|OWNER_OF]->(p)
      OPTIONAL MATCH (u2)-[rTeam:MEMBER_OF|OWNER_OF|INVITED_TO]->(tTeam:Team)-[:HAS_PROJECT]->(p)
      RETURN 
         rDirect IS NOT NULL AS isDirectlyInvolved,
        rProj.capabilities AS projectCaps,
        rTeam.defaultProjectCapabilities AS teamDefaultCaps,
        type(rTeam) AS teamRel
    `;
         
    const result = await session.run(cypher, { userUid, taskUid });
    if (!result || result.records.length === 0) return [];

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
    console.error("  Fracture lors de la compilation d'Aura sur l'Atome :", error);
    return [];
  } finally {
    await session?.close?.();
  }
}

// ==========================================
// GET : Ausculter un Atome spécifique
// ==========================================
export const GET = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  const resolvedParams = await context.params;
  const rawSlug = resolvedParams?.slug;
  const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
  
  if (!identifier) {
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  }

  // 🔍 Résolution unifiée via le cache ou notre helper centralisé
  let data = await getCachedTaskDetails(identifier, currentUser.uid, getTaskCapabilities);
  if (!data || !data.task) {
    const resolvedTask: any = await findEntityBySlugOrUid(TaskModel, identifier);
    if (resolvedTask) {
      data = await getCachedTaskDetails(resolvedTask.uid, currentUser.uid, getTaskCapabilities);
    }
  }

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
// POST : Actions sur un Atome (Sous-tâche)
// ==========================================
export const POST = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  const resolvedParams = await context.params;
  const rawSlug = resolvedParams?.slug;
  const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

  if (!identifier) {
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  }

  // 🔍 Résolution de l'entité par slug ou UID pour obtenir l'UID canonique
  const taskEntity: any = await findEntityBySlugOrUid(TaskModel, identifier);
  const targetUid = taskEntity?.uid || identifier;

  const caps = await getTaskCapabilities(currentUser.uid, targetUid);
  if (!caps.includes(CAPABILITIES.TASK.UPDATE) && !currentUser.capabilities?.includes('*')) {
      return NextResponse.json({ error: "Aura insuffisante pour agir sur cet Atome." }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
  }

  const { action, data } = body;
  
  if (action === 'CREATE_SUBTASK') {
    const validationResult = SubTaskSchema.safeParse(data);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues.map(e => e.message).join(', ');
      return NextResponse.json({ error: `Données de sous-tâche invalides : ${errorMessage}` }, { status: 400 });
    }

    try {
      const taskOrch = new TaskOrchestrator();
      const signature: ActionSignature = { actorUid: currentUser.uid, capabilities: caps };
      const newSubTask = await taskOrch.fosterTask({
        ...validationResult.data,
        projectUid: taskEntity?.projectUid,
        parentUid: targetUid
      }, signature);
      revalidateTag('tasks');
      revalidateTag(`task-${identifier}`);
      if (taskEntity?.uid) revalidateTag(`task-${taskEntity.uid}`);
      if (taskEntity?.slug) revalidateTag(`task-${taskEntity.slug}`);
      return NextResponse.json(newSubTask, { status: 201 });
    } catch (orchErr: any) {
      console.error("  [TASK ORCHESTRATOR SUBTASK ERROR]", orchErr);
      const status = orchErr.statusCode || orchErr.status || 500;
      return NextResponse.json({ error: orchErr.message || "Échec de fondation de sous-atome." }, { status });
    }
  }
  return NextResponse.json({ error: "Mouvement inconnu sur cet Atome." }, { status: 400 });
});

// ==========================================
// PATCH : Mutation d'un Atome
// ==========================================
export const PATCH = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  const resolvedParams = await context.params;
  const rawSlug = resolvedParams?.slug;
  const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

  if (!identifier) {
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  }

  // 🔍 Résolution unifiée pour cibler la tâche
  const taskEntity: any = await findEntityBySlugOrUid(TaskModel, identifier);
  const targetUid = taskEntity?.uid || identifier;

  const caps = await getTaskCapabilities(currentUser.uid, targetUid);
  if (!caps.includes(CAPABILITIES.TASK.UPDATE) && !currentUser.capabilities?.includes('*')) {
      return NextResponse.json({ error: "Tu ne peux pas faire muter cet Atome." }, { status: 403 });
  }

  let rawBody;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
  }

  const validationResult = UpdateTaskSchema.safeParse(rawBody);
  if (!validationResult.success) {
    const errorMessage = validationResult.error.issues.map(e => e.message).join(', ');
    return NextResponse.json({ error: `Données de mutation invalides : ${errorMessage}` }, { status: 400 });
  }

  const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: caps
  };

  let updatedTask;
  try {
    const taskOrch = new TaskOrchestrator();
     updatedTask = await taskOrch.updateTask(targetUid, validationResult.data, signature);
  } catch (orchErr: any) {
    console.error("  [TASK ORCHESTRATOR UPDATE ERROR]", orchErr);
    const status = orchErr.statusCode || orchErr.status || 500;
    return NextResponse.json({ error: orchErr.message || "Échec de la mutation de l'Atome." }, { status });
  }

  revalidateTag('tasks');
  revalidateTag(`task-${identifier}`);
  if (taskEntity?.uid) revalidateTag(`task-${taskEntity.uid}`);
  if (taskEntity?.slug) revalidateTag(`task-${taskEntity.slug}`);

  return NextResponse.json(updatedTask, { status: 200 });
});

// ==========================================
// DELETE : Désintégration d'un Atome
// ==========================================
export const DELETE = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  const resolvedParams = await context.params;
  const rawSlug = resolvedParams?.slug;
  const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

  if (!identifier) {
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  }

  // 🔍 Résolution unifiée pour cibler la désintégration
  const taskEntity: any = await findEntityBySlugOrUid(TaskModel, identifier);
  const targetUid = taskEntity?.uid || identifier;

  const caps = await getTaskCapabilities(currentUser.uid, targetUid);
  if (!caps.includes(CAPABILITIES.TASK.DELETE) && !currentUser.capabilities?.includes('*')) {
      return NextResponse.json({ error: "La désintégration de cet Atome requiert plus d'aura." }, { status: 403 });
  }

  const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: caps
  };

  try {
    const taskOrch = new TaskOrchestrator();
     await taskOrch.disintegrateTask(targetUid, signature);
  } catch (orchErr: any) {
    console.error("  [TASK ORCHESTRATOR DISINTEGRATE ERROR]", orchErr);
    const status = orchErr.statusCode || orchErr.status || 500;
    return NextResponse.json({ error: orchErr.message || "Échec du rituel de désintégration." }, { status });
  }

  revalidateTag('tasks');
  revalidateTag(`task-${identifier}`);
  if (taskEntity?.uid) revalidateTag(`task-${taskEntity.uid}`);
  if (taskEntity?.slug) revalidateTag(`task-${taskEntity.slug}`);

  return NextResponse.json({ message: "Atome rendu à la poussière du Nexus." }, { status: 200 });
});