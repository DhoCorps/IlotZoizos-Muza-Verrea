import { NextResponse } from 'next/server';
import { ProjectModel, getNeo4jSession } from '@ilot/infrastructure'; 
import { TaskOrchestrator } from '@ilot/shared-core';
import { CAPABILITIES, ActionSignature } from '@ilot/types';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { getCachedTasks } from '@/lib/cache/tasks.cache';

export const dynamic = 'force-dynamic';

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
    console.error("  [PROJECT CAPS ERROR]", error);
    return [];
  } finally {
    await session?.close?.();
  }
}

// ==========================================
// GET : Découverte des Atomes
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
// POST : Forger un nouvel Atome
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
  
  revalidateTag(`project-${projectUid}`);
  revalidateTag(`user-tasks-${currentUser.uid}`);
  return NextResponse.json(newTask, { status: 201 });
});