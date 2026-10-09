export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { SampleModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { ISample } from '@ilot/types';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { SamplotekOrchestrator } from '@ilot/shared-core';

// ==========================================
// 🚩 POST : Signaler un Sample (Modération Communautaire)
// ==========================================
export const POST = withAura(async (_req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    let resolvedParams;
    try {
      resolvedParams = await context.params;
    } catch {
      return NextResponse.json({ success: false, error: "Paramètres de route invalides." }, { status: 400 });
    }

    const identifier = slugify(resolvedParams?.slug as string);
    if (!identifier) {
      return NextResponse.json({ success: false, error: "Identifiant de sample invalide." }, { status: 400 });
    }

    // 1. Auscultation du Sample visé
    const targetSample = await findEntityBySlugOrUid(SampleModel, identifier) as ISample | null;
    if (!targetSample) {
      return NextResponse.json({ success: false, error: "Sample introuvable." }, { status: 404 });
    }

    // 2. Transfert de responsabilité à l'Orchestrateur pour la logique de seuil et quarantaine
    const orchestrator = new SamplotekOrchestrator();
    let result;
    try {
      result = await orchestrator.reportSample(targetSample.uid, { 
        actorUid: currentUser.uid, 
        capabilities: currentUser.capabilities || [] 
      });
    } catch (orchErr: unknown) {
      const err = orchErr as { status?: number; statusCode?: number; message?: string };
      const status = err.status || err.statusCode || 500;
      return NextResponse.json({ success: false, error: err.message || "L'Orchestrateur a rejeté le signalement." }, { status });
    }

    // 3. Invalidation du cache pour mettre à jour la galerie publique (surtout si mise en quarantaine)
    revalidateTag('samples');
    revalidateTag('samplotek-public-catalog');
    revalidateTag(`sample-${targetSample.uid}`);
    if (targetSample.slug) {
      revalidateTag(`sample-${targetSample.slug}`);
    }

    // 4. Réponse adaptative selon le franchissement du seuil de modération
    const message = result.isQuarantined 
      ? "Signalement confirmé. Le sample a dépassé le seuil de tolérance et a été placé en quarantaine."
      : "Signalement enregistré avec succès. Merci pour ta vigilance.";

    return NextResponse.json({
      success: true,
      message,
      data: result.mongo
    }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, 'SAMPLE REPORT ERROR');
  }
});