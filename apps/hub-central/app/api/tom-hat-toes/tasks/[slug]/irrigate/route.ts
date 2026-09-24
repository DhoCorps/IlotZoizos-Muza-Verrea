export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { TaskIrrigationOrchestrator } from '@ilot/shared-core';
import { TaskModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';

/**
 * 💧 POST : Déclenchement de l'Irrigation de la Sève sur un Atome (Tâche)
 */
export const POST = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    // 1. Résolution des paramètres de route avec gestion d'erreur robuste
    let resolvedParams;
    try {
      resolvedParams = await context.params;
    } catch {
      return NextResponse.json({ error: "Paramètres de route invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 2. Résolution unifiée de la tâche par slug ou UID via le helper centralisé
    let task: { uid?: string; slug?: string; [key: string]: unknown } | null;
    try {
      task = (await findEntityBySlugOrUid(TaskModel, identifier)) as typeof task;
    } catch (err) {
      console.error("🔥 [TASK FIND ERROR]", err);
      return NextResponse.json({ error: "Erreur lors de la lecture de la Silice." }, { status: 500 });
    }

    if (!task) {
      return NextResponse.json({ error: "Tâche introuvable." }, { status: 404 });
    }

    // 3. Préparation de la signature d'action
    const signature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    // 4. Exécution de l'orchestrateur d'irrigation en utilisant le véritable UID résolu
    let result;
    try {
      const orchestrator = new TaskIrrigationOrchestrator();
      result = await orchestrator.processTaskIrrigation(task.uid || identifier, signature);
    } catch (orchErr: unknown) {
      const err = orchErr as { status?: number; statusCode?: number; message?: string };
      console.error("🌋 [TASK ORCHESTRATOR IRRIGATION ERROR] : Échec de l'orchestration de la sève", err);
      const status = err.status || err.statusCode || 500;
      return NextResponse.json(
        { error: err.message || "Erreur interne de la sève." }, 
        { status }
      );
    }

    // 5. 💥 BOOM ! Invalidation chirurgicale du cache en cascade
    revalidateTag('tasks');
    revalidateTag(`task-${identifier}`);
    if (task.uid) revalidateTag(`task-${task.uid}`);
    if (task.slug) revalidateTag(`task-${task.slug}`);

    return NextResponse.json(result, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, "TASK IRRIGATION FATAL ERROR");
  }
});