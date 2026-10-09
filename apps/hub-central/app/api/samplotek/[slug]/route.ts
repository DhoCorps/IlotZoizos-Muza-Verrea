export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { SampleModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { ISample } from '@ilot/types';
import { storageService } from '@/modules/storage/storage.service';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, withOptionalAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { getCachedSample } from '@/lib/cache/samplotek.cache'; 
import { IlotError } from '@ilot/shared-core';
import { z } from 'zod';

// 🛡️ Schéma strict pour la mutation (PUT)
const UpdateSampleSchema = z.object({
  title: z.string().min(1, "Le titre est requis.").optional(),
  tempoBpm: z.number().min(40).max(300).optional(),
  musicalKey: z.string().optional(),
  style: z.string().optional(),
  permissions: z.object({
    allowRadio: z.boolean().optional(),
    allowBlindTest: z.boolean().optional(),
    allowShowcase: z.boolean().optional(),
  }).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  seo: z.object({
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    keywords: z.array(z.string()).optional()
  }).optional()
});

// ==========================================
// 🔍 GET : Ausculter un Sample (Public + Cache Edge)
// ==========================================
export const GET = withOptionalAura(async (_req: NextRequest, context: ApiContext, currentUser?: OiseauUser) => {
  try {
    let resolvedParams;
    try {
      resolvedParams = await context.params;
    } catch {
      return NextResponse.json({ success: false, error: "Paramètres de route invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    
    if (!identifier) return NextResponse.json({ success: false, error: "Identifiant invalide." }, { status: 400 });

    let sample = (await getCachedSample(identifier)) as ISample | null;
    if (!sample) {
      sample = (await findEntityBySlugOrUid(SampleModel, identifier)) as ISample | null;
    }

    if (!sample) return NextResponse.json({ success: false, error: "Sample évaporé." }, { status: 404 });

    const isMine = currentUser && sample.authorUid === currentUser.uid;
    const isArchitect = currentUser?.capabilities?.includes('*');
    
    // Garde-fou de sécurité et Modération
    const isPublic = sample.status === 'PUBLISHED' && !sample.moderation?.isQuarantined;
    if (!isPublic && !isMine && !isArchitect) {
      return NextResponse.json({ success: false, error: "Ce sample t'est fermé ou est en quarantaine." }, { status: 403 });
    }

    const response = NextResponse.json({ success: true, data: sample }, { status: 200 });
    
    if (isPublic && !isMine && !isArchitect) {
      response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    }
    return response;
  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors de la lecture du sample.");
  }
});

// ==========================================
// 🔄 PUT : Muter un Sample (Strictement Privé)
// ==========================================
export const PUT = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    let resolvedParams;
    let body;
    try {
      resolvedParams = await context.params;
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Requête illisible." }, { status: 400 });
    }

    const identifier = slugify(resolvedParams?.slug as string);
    const validation = UpdateSampleSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: "Données de mutation invalides.", details: validation.error.flatten() }, { status: 400 });
    }

    const targetSample = await findEntityBySlugOrUid(SampleModel, identifier) as ISample | null;
    if (!targetSample) return NextResponse.json({ success: false, error: "Sample introuvable." }, { status: 404 });

    if (targetSample.authorUid !== currentUser.uid && !currentUser.capabilities?.includes('*')) {
      return NextResponse.json({ success: false, error: "Souveraineté violée." }, { status: 403 });
    }

    const updatedSample = await SampleModel.findOneAndUpdate(
      { uid: targetSample.uid },
      { $set: validation.data },
      { new: true }
    ).lean();

    revalidateTag('samples');
    revalidateTag(`sample-${targetSample.uid}`);
    if (targetSample.slug) revalidateTag(`sample-${targetSample.slug}`);

    return NextResponse.json({ success: true, data: updatedSample }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "Erreur lors de la mutation.");
  }
});

// ==========================================
// 💥 DELETE : Dissoudre un Sample (Strictement Privé)
// ==========================================
export const DELETE = withAura(async (_req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    let resolvedParams;
    try {
      resolvedParams = await context.params;
    } catch {
      return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
    }

    const identifier = slugify(resolvedParams?.slug as string);
    const sample = await findEntityBySlugOrUid(SampleModel, identifier) as ISample | null;
    if (!sample) return NextResponse.json({ error: "Sample introuvable." }, { status: 404 });

    if (sample.authorUid !== currentUser.uid && !currentUser.capabilities?.includes('*')) {
      return NextResponse.json({ error: "Souveraineté violée." }, { status: 403 });
    }

    if (sample.storageKey) {
      try {
        await storageService.deleteFile(sample.storageKey);
      } catch (s3Err) {
        console.error("🔥 [Storage DELETE ERROR]", s3Err);
      }
    }

    await SampleModel.deleteOne({ uid: sample.uid });

    revalidateTag('samples');
    revalidateTag(`samples-user-${sample.authorUid}`);
    revalidateTag(`sample-${sample.uid}`);
    if (sample.slug) revalidateTag(`sample-${sample.slug}`);

    return NextResponse.json({ success: true, message: "Sample réduit en cendres." }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, 'SAMPLETEK DELETE FATAL ERROR');
  }
});