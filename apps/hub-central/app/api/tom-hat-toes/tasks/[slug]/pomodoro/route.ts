export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { TaskModel, findEntityBySlugOrUid, getNeo4jSession } from '@ilot/infrastructure';
import { TaskOrchestrator } from '@ilot/shared-core';
import { CAPABILITIES, ActionSignature } from '@ilot/types';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';

async function getTaskCapabilitiesForPomodoro(userUid: string, taskUid: string): Promise<string[]> {
  const session = getNeo4jSession();
  try {
    if (!session) return ['*'];
    const cypher = `
      MATCH (t:Task {uid: $taskUid})
      OPTIONAL MATCH (t)-[:TASK_OF]->(p:Project)
      OPTIONAL MATCH (u1:User {uid: $userUid})-[rDirect:ASSIGNED_TO|CREATED]->(t)
      OPTIONAL MATCH (u2:User {uid: $userUid})-[rProj:CONTRIBUTES_TO|OWNER_OF]->(p)
      RETURN rDirect IS NOT NULL AS isDirectlyInvolved, rProj.capabilities AS projectCaps
    `;
    const result = await session.run(cypher, { userUid, taskUid });
    if (!result || result.records.length === 0) return [];

    const record = result.records[0];
    const isDirectlyInvolved = record.get('isDirectlyInvolved');
    const projectCaps = record.get('projectCaps') || [];
    const compiledCaps = [...projectCaps];
    if (isDirectlyInvolved) {
      compiledCaps.push(CAPABILITIES.TASK.UPDATE);
    }
    return compiledCaps;
  } catch (error) {
    console.error("🔥 [POMODORO CAPS ERROR]", error);
    return [];
  } finally {
    await session?.close?.();
  }
}

// ==========================================
// 🍅 POST : Valider un cycle Pomodoro sur un Atome via [slug]
// ==========================================
export const POST = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    let resolvedParams;
    try {
      resolvedParams = await context.params;
    } catch {
      return NextResponse.json({ error: "Paramètres de route invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ error: "Identifiant d'atome invalide." }, { status: 400 });
    }

    // 🔍 Résolution unifiée de l'atome par slug ou UID
    const taskEntity = (await findEntityBySlugOrUid(TaskModel, identifier)) as { uid?: string; slug?: string; [key: string]: unknown } | null;
    if (!taskEntity) {
      return NextResponse.json({ error: "Atome introuvable pour le Pomodoro." }, { status: 404 });
    }

    const targetUid = taskEntity.uid || identifier;
    const caps = await getTaskCapabilitiesForPomodoro(currentUser.uid, targetUid);

    if (!caps.includes(CAPABILITIES.TASK.UPDATE) && !currentUser.capabilities?.includes('*')) {
      return NextResponse.json({ error: "Aura insuffisante pour valider un cycle Pomodoro sur cet Atome." }, { status: 403 });
    }

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: caps
    };

    let updatedTask;
    try {
      const taskOrch = new TaskOrchestrator();
      updatedTask = await taskOrch.completePomodoro(targetUid, signature);
    } catch (orchErr: unknown) {
      const err = orchErr as { status?: number; statusCode?: number; message?: string };
      console.error("🔥 [TASK ORCHESTRATOR POMODORO ERROR]", err);
      const status = err.statusCode || err.status || 500;
      return NextResponse.json({ error: err.message || "Échec de validation du Pomodoro." }, { status });
    }

    // 💥 Invalidation chirurgicale du cache en cascade
    revalidateTag('tasks');
    revalidateTag(`task-${identifier}`);
    if (taskEntity.uid) revalidateTag(`task-${taskEntity.uid}`);
    if (taskEntity.slug) revalidateTag(`task-${taskEntity.slug}`);

    return NextResponse.json(updatedTask, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, "TASK POMODORO FATAL ERROR");
  }
});