// apps/hub-central/app/api/samplotek/export/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { SampleModel } from '@ilot/infrastructure';
import { z } from 'zod';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { ISample } from '@ilot/types';
import { SamplotekOrchestrator } from '@ilot/shared-core';

const StudioExportSchema = z.object({
  title: z.string().min(2, "Le titre de l'œuvre est requis."),
  bpm: z.number().min(40).max(300),
  tracks: z.array(z.object({
    id: z.number(),
    sampleUid: z.string(),
    volume: z.number(),
    isMuted: z.boolean()
  })).min(1, "Le projet doit contenir au moins une piste active.")
});

export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const rawBody = await req.json().catch(() => null);
    if (!rawBody) return NextResponse.json({ success: false, error: 'Corps de requête illisible.' }, { status: 400 });

    const validation = StudioExportSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: 'Structure du projet invalide.', details: validation.error.flatten() }, { status: 400 });
    }

    const { title, bpm, tracks } = validation.data;
    const sampleUids = tracks.map(t => t.sampleUid);

    // 1. Auscultation des permissions dans la Silice
    const usedSamples: ISample[] = await SampleModel.find({ uid: { $in: sampleUids } }).lean();
    if (usedSamples.length === 0) {
      return NextResponse.json({ success: false, error: 'Aucun sample valide trouvé.' }, { status: 404 });
    }

    let finalAllowRadio = true;
    let finalAllowBlindTest = true;
    let finalAllowShowcase = true;

    usedSamples.forEach(sample => {
      if (!sample.permissions.allowRadio) finalAllowRadio = false;
      if (!sample.permissions.allowBlindTest) finalAllowBlindTest = false;
      if (!sample.permissions.allowShowcase) finalAllowShowcase = false;
    });

    // 2. Transfert à l'Orchestrateur pour le Mixage (Mongo + Neo4j + Univers)
    const orchestrator = new SamplotekOrchestrator();
    const result = await orchestrator.exportProject({
      title,
      bpm,
      tracks,
      metadata: {
        permissions: {
          allowRadio: finalAllowRadio,
          allowBlindTest: finalAllowBlindTest,
          allowShowcase: finalAllowShowcase
        },
        usedSampleUids: sampleUids
      }
    }, { actorUid: currentUser.uid, capabilities: currentUser.capabilities || [] });

    // 3. Invalidation du cache
    revalidateTag('partitas');
    revalidateTag(`partitas-user-${currentUser.uid}`);
    revalidateTag('universal-media');

    return NextResponse.json({
      success: true,
      message: 'Œuvre SamploTek mixée et sédimentée avec succès dans l\'Îlot !',
      data: result.mongo
    }, { status: 201 });

  } catch (error: any) {
    console.error('🔥 [STUDIO EXPORT ERROR] :', error);
    return NextResponse.json({ success: false, error: error.message || 'Erreur interne du mixage.' }, { status: error.status || 500 });
  }
});