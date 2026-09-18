export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { storageService } from '@/modules/storage/storage.service';
import { SampleModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { IlotError } from '@ilot/shared-core';

interface ISampleEntity {
  uid: string;
  slug?: string;
  authorUid?: string;
  storageKey?: string;
  [key: string]: unknown;
}

// ==========================================
// 🗑️ DELETE : Dissoudre/Désintégrer un sample de SamploTek
// ==========================================
export const DELETE = withAura(async (_req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    let resolvedParams;
    try {
      resolvedParams = await context.params;
    } catch {
      return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 Résolution unifiée par slug ou UID via notre helper centralisé
    const sample = (await findEntityBySlugOrUid(SampleModel, identifier)) as ISampleEntity | null;
    if (!sample) {
      return NextResponse.json({ error: "Sample introuvable dans la matrice." }, { status: 404 });
    }

    // 🛡️ Contrôle de souveraineté strict (Auteur ou Architecte)
    const isOwner = sample.authorUid === currentUser.uid;
    const isArchitect = currentUser.capabilities?.includes('*');
    if (!isOwner && !isArchitect) {
      return NextResponse.json({ error: "Souveraineté violée : tu ne peux dissoudre ce sample." }, { status: 403 });
    }

    // 1. Purge physique de l'audio sur Cloudflare R2
    if (sample.storageKey) {
      try {
        await storageService.deleteFile(sample.storageKey);
      } catch (s3Err) {
        console.error("🔥 [Storage DELETE ERROR - Sample]", s3Err);
      }
    }

    // 2. Nettoyage de la Silice (MongoDB)
    await SampleModel.deleteOne({ uid: sample.uid });

    // 💥 Invalidation chirurgicale du cache en cascade
    revalidateTag('samples');
    if (sample.authorUid) {
      revalidateTag(`samples-user-${sample.authorUid}`);
    }
    revalidateTag(`sample-${identifier}`);
    revalidateTag(`sample-${sample.uid}`);
    if (sample.slug) {
      revalidateTag(`sample-${sample.slug}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: "Le sample a été réduit en cendres et purgé du Nexus." 
    }, { status: 200 });

  } catch (error: unknown) {
    if (error instanceof IlotError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return handleRouteError(error, 'SAMPLETEK DELETE FATAL ERROR');
  }
});