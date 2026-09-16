import { NextResponse } from 'next/server';
import { TaskIrrigationOrchestrator } from '@ilot/shared-core';
import { TaskModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

export const dynamic = 'force-dynamic';

/**
 * 💧 POST : Déclenchement de l'Irrigation de la Sève sur un Atome (Tâche)
 */
export const POST = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
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
    let task: any;
    try {
      task = await findEntityBySlugOrUid(TaskModel, identifier);
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
      result = await orchestrator.processTaskIrrigation(task.uid, signature);
    } catch (orchErr: any) {
      console.error("🌋 [TASK ORCHESTRATOR IRRIGATION ERROR] : Échec de l'orchestration de la sève", orchErr);
      const status = orchErr.status || orchErr.statusCode || 500;
      return NextResponse.json(
        { error: orchErr.message || "Erreur interne de la sève." }, 
        { status }
      );
    }

    // 5. 💥 BOOM ! Invalidation chirurgicale du cache en cascade
    revalidateTag('tasks');
    revalidateTag(`task-${identifier}`);
    if (task.uid) revalidateTag(`task-${task.uid}`);
    if (task.slug) revalidateTag(`task-${task.slug}`);

    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Fracture globale lors de l'irrigation :", error);
    return NextResponse.json(
      { error: "Erreur interne globale lors de l'irrigation de l'atome." }, 
      { status: 500 }
    );
  }
});