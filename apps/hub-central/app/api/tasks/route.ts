import { NextResponse } from 'next/server';
import { TaskModel, ProjectModel, getNeo4jSession } from '@ilot/infrastructure'; 
import { TaskOrchestrator } from '@ilot/shared-core';
import { CAPABILITIES, ActionSignature } from '@ilot/types';
import { unstable_cache, revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

export const dynamic = 'force-dynamic';

/**
 * 🛡️ COMPILATEUR D'AURA ASCENDANTE
 * Résout si l'oiseau a le droit sur ce Chantier.
 */
async function getProjectCapabilities(userUid: string, projectUid: string): Promise<string[]> {
  const session = getNeo4jSession();
  try {
    if (!session) return [];
    const result = await session.run(
      `MATCH (u:User {uid: $userUid})
        OPTIONAL MATCH (u)-[r:CONTRIBUTES_TO|OWNER_OF]->(pDirect:Project {uid: $projectUid})
        OPTIONAL MATCH (u)-[rTeam:MEMBER_OF|INVITED_TO]->(t:Team)-[:HAS_PROJECT]->(pTeam:Project {uid: $projectUid})
        RETURN r.capabilities AS directCaps, t.defaultProjectCapabilities AS teamCaps, type(rTeam) AS teamRel`,
      { userUid, projectUid }
    );
    if (!result || result.records.length === 0) return [];
    
    const record = result.records[0];
    const direct = record.get('directCaps') || [];
    const team = record.get('teamCaps') || [];
    const teamRel = record.get('teamRel');
    
    let compiledCaps = [...new Set([...direct, ...team])];

    if (teamRel === 'INVITED_TO') {
      if (!compiledCaps.includes(CAPABILITIES.PROJECT.READ)) compiledCaps.push(CAPABILITIES.PROJECT.READ);
      if (!compiledCaps.includes(CAPABILITIES.TASK.READ)) compiledCaps.push(CAPABILITIES.TASK.READ);
    }
    return compiledCaps;
  } catch (error) {
    console.error("🔥 [PROJECT CAPS ERROR]", error);
    return [];
  } finally {
    // 🛡️ SUTURE DE SÉCURITÉ : Utilisation de l'optional chaining pour éviter les plantages de session vide
    await session?.close?.();
  }
}

// 🧠 CACHE : Récupération des tâches (Hydratation Graphe + Silice)
const getCachedTasks = async (userUid: string, projectUid?: string) => {
  return unstable_cache(
    async () => {
      const neo4jSession = getNeo4jSession();
      let tasksFromGraph: Record<string, string[]> = {};
      try {
        if (neo4jSession) {
          const params: any = projectUid ? { projectUid } : { userUid };
          const cypher = projectUid 
            ? `MATCH (t:Task)-[:TASK_OF]->(p:Project {uid: $projectUid}) OPTIONAL MATCH (bird:User)-[:ASSIGNED_TO]->(t) RETURN t.uid AS taskUid, collect(bird.uid) AS assignees`
            : `MATCH (me:User {uid: $userUid})-[:ASSIGNED_TO]->(t:Task) OPTIONAL MATCH (bird:User)-[:ASSIGNED_TO]->(t) RETURN t.uid AS taskUid, collect(bird.uid) AS assignees`;
          
          const result = await neo4jSession.run(cypher, params);
          result?.records?.forEach(r => { tasksFromGraph[r.get('taskUid')] = r.get('assignees'); });
        }
      } finally {
        await neo4jSession?.close?.();
      }

      const taskUids = Object.keys(tasksFromGraph);
      if (taskUids.length === 0) {
        // Fallback Silice pure si le graphe est silencieux en mode test
        const query = projectUid ? { projectUid } : {};
        const fallbackTasks = await TaskModel.find(query).sort({ 'dates.updatedAt': -1 }).lean();
        return fallbackTasks.map(t => ({ ...t, assigneeUids: [] }));
      }

      const tasks = await TaskModel.find({ uid: { $in: taskUids } }).sort({ 'dates.updatedAt': -1 }).lean();
      return tasks.map(t => ({ ...t, assigneeUids: tasksFromGraph[t.uid] || [] }));
    },
    [`tasks-${userUid}-${projectUid || 'global'}`],
    { revalidate: 60, tags: ['tasks', projectUid ? `project-${projectUid}` : `user-tasks-${userUid}`] }
  )();
};

// ==========================================
// 🔍 GET : Découverte des Atomes
// ==========================================
export const GET = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  const { searchParams } = new URL(req.url);
  const projectUid = searchParams.get('projectUid') || undefined;

  if (projectUid) {
    const project = await ProjectModel.findOne({ uid: projectUid }).lean();
    if (!project) return NextResponse.json([], { status: 200 });

    const caps = await getProjectCapabilities(currentUser.uid, projectUid);
    const canRead = currentUser.capabilities.includes('*') || project.creatorUid === currentUser.uid || caps.includes(CAPABILITIES.PROJECT.READ);
    
    if (!canRead) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const tasks = await getCachedTasks(currentUser.uid, projectUid);
  return NextResponse.json(tasks, { status: 200 });
});

// ==========================================
// 🚀 POST : Forger un nouvel Atome
// ==========================================
export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  const body = await req.json();
  const { projectUid } = body;
  if (!projectUid) return NextResponse.json({ error: "projectUid obligatoire." }, { status: 400 });

  const project = await ProjectModel.findOne({ uid: projectUid }).lean();
  if (!project) return NextResponse.json({ error: "Chantier introuvable." }, { status: 404 });

  const caps = await getProjectCapabilities(currentUser.uid, projectUid);
  const canCreate = currentUser.capabilities?.includes('*') || project.creatorUid === currentUser.uid || caps.includes(CAPABILITIES.TASK.CREATE);
  
  if (!canCreate) return NextResponse.json({ error: "Aura insuffisante." }, { status: 403 });

  const signature: ActionSignature = { actorUid: currentUser.uid, capabilities: currentUser.capabilities };
  const taskOrch = new TaskOrchestrator();
  const newTask = await taskOrch.fosterTask(body, signature);

  // 💥 Invalidation du cache pour ce chantier
  revalidateTag(`project-${projectUid}`);
  revalidateTag(`user-tasks-${currentUser.uid}`);

  return NextResponse.json(newTask, { status: 201 });
});