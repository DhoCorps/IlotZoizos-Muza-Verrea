export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { ProjectModel, getNeo4jSession } from '@ilot/infrastructure'; 
import { TaskOrchestrator } from '@ilot/shared-core';
import { CAPABILITIES, ActionSignature } from '@ilot/types';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { getCachedTasks } from '@/lib/cache/tasks.cache';
import { z } from 'zod';

// ==========================================
// 🛡️ SCHÉMA DE VALIDATION ZOD (Anti Mass Assignment)
// ==========================================
const CreateTaskSchema = z.object({
  projectUid: z.string().min(1, "Le projectUid est requis."),
  title: z.string().optional(),
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
}).refine(data => data.title || data.name, {
  message: "Un titre ou un nom est requis pour forger l'atome.",
  path: ["title"],
});

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
    const direct = (record.get('directCaps') || []) as string[];
    const team = (record.get('teamCaps') || []) as string[];
    const teamRel = record.get('teamRel');
         
    const compiledCaps = [...new Set([...direct, [...team]])] as string[];
    if (teamRel === 'INVITED_TO') {
      if (!compiledCaps.includes(CAPABILITIES.PROJECT.READ)) compiledCaps.push(CAPABILITIES.PROJECT.READ);
      if (!compiledCaps.includes(CAPABILITIES.TASK.READ)) compiledCaps.push(CAPABILITIES.TASK.READ);
    }
    return compiledCaps;
  } catch (error) {
    console.error("  [PROJECT CAPS ERROR]", error);
    return [];
  } finally {
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
// GET : Découverte des Atomes
// ==========================================
export const GET = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let url: URL;
    try {
      url = new URL(req.url);
    } catch {
      return NextResponse.json({ error: "URL de requête invalide." }, { status: 400 });
    }

    const projectUid = url.searchParams.get('projectUid') || undefined;
    if (projectUid) {
      const project = (await ProjectModel.findOne({ uid: projectUid }).lean()) as { creatorUid?: string; [key: string]: unknown } | null;
      if (!project) return NextResponse.json([], { status: 200 });
      const caps = await getProjectCapabilities(currentUser.uid, projectUid);
      const canRead = currentUser.capabilities?.includes('*') || project.creatorUid === currentUser.uid || caps.includes(CAPABILITIES.PROJECT.READ);
           
      if (!canRead) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }
    const tasks = await getCachedTasks(currentUser.uid, projectUid);
    return NextResponse.json(tasks, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "TASKS GET ERROR");
  }
});

// ==========================================
// POST : Forger un nouvel Atome
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    // Validation stricte par Zod pour empêcher toute injection malveillante (Mass Assignment)
    const validationResult = CreateTaskSchema.safeParse(rawBody);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues.map(e => e.message).join(', ');
      return NextResponse.json({ error: `Données d'atome invalides : ${errorMessage}` }, { status: 400 });
    }

    const validatedData = validationResult.data;
    const projectUid = validatedData.projectUid;

    const project = (await ProjectModel.findOne({ uid: projectUid }).lean()) as { creatorUid?: string; [key: string]: unknown } | null;
    if (!project) return NextResponse.json({ error: "Chantier introuvable." }, { status: 404 });

    const caps = await getProjectCapabilities(currentUser.uid, projectUid);
    const canCreate = currentUser.capabilities?.includes('*') || project.creatorUid === currentUser.uid || caps.includes(CAPABILITIES.TASK.CREATE);
    if (!canCreate) return NextResponse.json({ error: "Aura insuffisante." }, { status: 403 });

    const signature: ActionSignature = { actorUid: currentUser.uid, capabilities: currentUser.capabilities || [] };
    const taskOrch = new TaskOrchestrator();
    
    // 🛡️ Passage avec typage sécurisé pour satisfaire FosterTaskPayload
    const newTask = await taskOrch.fosterTask({
      ...validatedData,
      status: validatedData.status as any
    }, signature);
    
    revalidateTag(`project-${projectUid}`);
    revalidateTag(`user-tasks-${currentUser.uid}`);
    return NextResponse.json(newTask, { status: 201 });
  } catch (error: unknown) {
    return handleRouteError(error, "TASKS POST ERROR");
  }
});