import { NextResponse } from 'next/server';
import { TaskIrrigationOrchestrator } from '@ilot/shared-core';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

export const dynamic = 'force-dynamic';

/**
 * 💧 POST : Déclenchement de l'Irrigation de la Sève sur un Atome (Tâche)
 */
export const POST = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    // 1. Résolution des paramètres de route
    const resolvedParams = await context.params;
    const rawSlug = resolvedParams?.slug;
    const slug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    // 2. Préparation de la signature d'action
    const signature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    // 3. Exécution de l'orchestrateur d'irrigation
    let result;
    try {
      const orchestrator = new TaskIrrigationOrchestrator();
      result = await orchestrator.processTaskIrrigation(slug, signature);
    } catch (orchErr: any) {
      console.error("🌋 [TASK ORCHESTRATOR IRRIGATION ERROR] : Échec de l'orchestration de la sève", orchErr);
      const status = orchErr.status || orchErr.statusCode || 500;
      return NextResponse.json(
        { error: orchErr.message || "Erreur interne de la sève." }, 
        { status }
      );
    }

    // 4. 💥 BOOM ! Invalidation chirurgicale du cache
    // L'irrigation modifie l'état/santé de la tâche, on purge les tags concernés
    revalidateTag('tasks');
    revalidateTag(`task-${slug}`);

    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Fracture globale lors de l'irrigation :", error);
    return NextResponse.json(
      { error: "Erreur interne globale lors de l'irrigation de l'atome." }, 
      { status: 500 }
    );
  }
});