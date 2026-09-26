export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { CVTemplateModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { IlotError } from '@ilot/shared-core';
import { getCachedTemplateDetail } from '@/lib/cache/kontakt.cache';
import { handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

// 🛡️ Schéma Zod strict pour éviter les vulnérabilités d'assignation de masse (Mass Assignment)
const UpdateCVTemplateSchema = z.object({
  title: z.string().min(1, "Le titre est requis.").optional(),
  description: z.string().optional(),
  priceShards: z.number().min(0).optional(),
  barterAccepted: z.boolean().optional(),
  letrinFontFamily: z.string().optional(),
  blocks: z.array(z.unknown()).optional(),
  previewUrl: z.string().url().nullable().optional(),
  tags: z.array(z.string()).optional(), // 🏷️ Intégration des tags pour le référencement cosmétique
});

type UpdateCVTemplateInput = z.infer<typeof UpdateCVTemplateSchema>;

interface CVTemplateDocument {
  uid: string;
  slug?: string;
  title?: string;
  tags?: string[];
  [key: string]: unknown;
}

export const GET = withSilice(async (_req: NextRequest, context: ApiContext) => {
  try {
    let resolvedParams;
    try {
      resolvedParams = await context.params;
      if (resolvedParams instanceof Promise) {
        resolvedParams = await resolvedParams;
      }
    } catch {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    // Tentative via le cache, puis repli sur le helper unifié
    let template = (await getCachedTemplateDetail(identifier)) as CVTemplateDocument | null;
    if (!template) {
      template = (await findEntityBySlugOrUid(CVTemplateModel, identifier)) as CVTemplateDocument | null;
    }

    if (!template) {
      return NextResponse.json({ error: 'Parchemin introuvable dans la matrice.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: template }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, 'KONTAKT TEMPLATE GET ERROR');
  }
});

export const PUT = withAura(async (req: NextRequest, context: ApiContext, _currentUser: OiseauUser) => {
  try {
    let resolvedParams;
    let body: unknown;
    try {
      resolvedParams = await context.params;
      if (resolvedParams instanceof Promise) {
        resolvedParams = await resolvedParams;
      }
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Requête ou paramètres invalides.' }, { status: 400 });
    }
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    // 🛡️ Validation stricte via Zod pour bloquer le Mass Assignment
    const validation = UpdateCVTemplateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Données de mutation corrompues.', details: validation.error.flatten() }, { status: 400 });
    }
    const sanitizedData: UpdateCVTemplateInput = validation.data;

    // 🔍 Recherche unifiée pour trouver l'entité par slug ou UID avant mise à jour
    const targetTemplate = (await findEntityBySlugOrUid(CVTemplateModel, identifier, { lean: false })) as CVTemplateDocument | null;
    if (!targetTemplate) {
      return NextResponse.json({ error: 'Parchemin introuvable dans la matrice.' }, { status: 404 });
    }

    const updatedTemplate = (await CVTemplateModel.findOneAndUpdate(
      { uid: targetTemplate.uid }, 
      { $set: sanitizedData }, 
      { new: true }
    ).lean()) as CVTemplateDocument | null;

    if (!updatedTemplate) {
      return NextResponse.json({ error: 'Parchemin introuvable dans la matrice.' }, { status: 404 });
    }

    revalidateTag('cv-templates');
    revalidateTag('kontakt-templates');
    revalidateTag(`template-${identifier}`);
    if (updatedTemplate.slug) {
      revalidateTag(`template-${updatedTemplate.slug}`);
    }
    if (updatedTemplate.uid) {
      revalidateTag(`template-${updatedTemplate.uid}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Le parchemin a muté avec succès.',
      data: updatedTemplate
    }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, 'KONTAKT TEMPLATE PUT ERROR');
  }
});

export const DELETE = withAura(async (_req: NextRequest, context: ApiContext, _currentUser: OiseauUser) => {
  try {
    let resolvedParams;
    try {
      resolvedParams = await context.params;
      if (resolvedParams instanceof Promise) {
        resolvedParams = await resolvedParams;
      }
    } catch {
      return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 });
    }
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 Utilisation de notre helper unifié pour cibler la suppression
    const targetTemplate = (await findEntityBySlugOrUid(CVTemplateModel, identifier)) as CVTemplateDocument | null;
    if (!targetTemplate) {
      return NextResponse.json({ error: 'Parchemin introuvable pour dissolution.' }, { status: 404 });
    }

    const deletedTemplate = await CVTemplateModel.findOneAndDelete({ uid: targetTemplate.uid });
    if (!deletedTemplate) {
      return NextResponse.json({ error: 'Parchemin introuvable pour dissolution.' }, { status: 404 });
    }

    revalidateTag('cv-templates');
    revalidateTag('kontakt-templates');
    revalidateTag(`template-${identifier}`);
    revalidateTag(`template-${targetTemplate.uid}`);

    return NextResponse.json({
      success: true,
      message: `Le template [${identifier}] a été désintégré de la matrice.`
    }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, 'KONTAKT TEMPLATE DELETE ERROR');
  }
});