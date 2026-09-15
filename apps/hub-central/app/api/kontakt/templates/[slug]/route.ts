export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { CVTemplateModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { IlotError } from '@ilot/shared-core';
import { getCachedTemplateDetail } from '@/lib/cache/kontakt.cache';

export const GET = withSilice(async (_req: Request, context: ApiContext) => {
  try {
    let resolvedParams;
    try {
      resolvedParams = await context.params;
      if (resolvedParams instanceof Promise) {
        resolvedParams = await resolvedParams;
      }
    } catch (err) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    // Tentative via le cache, puis repli sur le helper unifié
    let template: any = await getCachedTemplateDetail(identifier);
    if (!template) {
      template = await findEntityBySlugOrUid(CVTemplateModel, identifier);
    }

    if (!template) {
      return NextResponse.json({ error: 'Parchemin introuvable dans la matrice.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: template }, { status: 200 });
  } catch (error: any) {
    const status = error instanceof IlotError ? error.status : 500;
    return NextResponse.json({ error: error.message || 'Erreur interne du serveur.' }, { status });
  }
});

export const PUT = withAura(async (req: Request, context: ApiContext, _currentUser: OiseauUser) => {
  try {
    let resolvedParams;
    let body;
    try {
      resolvedParams = await context.params;
      if (resolvedParams instanceof Promise) {
        resolvedParams = await resolvedParams;
      }
      body = await req.json();
    } catch (err) {
      return NextResponse.json({ error: 'Requête ou paramètres invalides.' }, { status: 400 });
    }
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 Recherche unifiée pour trouver l'entité par slug ou UID avant mise à jour
    const targetTemplate: any = await findEntityBySlugOrUid(CVTemplateModel, identifier, { lean: false });
    if (!targetTemplate) {
      return NextResponse.json({ error: 'Parchemin introuvable dans la matrice.' }, { status: 404 });
    }

    const updatedTemplate = await CVTemplateModel.findOneAndUpdate(
      { uid: targetTemplate.uid }, 
      body, 
      { new: true }
    ).lean();

    if (!updatedTemplate) {
      return NextResponse.json({ error: 'Parchemin introuvable dans la matrice.' }, { status: 404 });
    }

    revalidateTag('cv-templates');
    revalidateTag('kontakt-templates');
    revalidateTag(`template-${identifier}`);
    if ((updatedTemplate as any).slug) {
      revalidateTag(`template-${(updatedTemplate as any).slug}`);
    }
    if ((updatedTemplate as any).uid) {
      revalidateTag(`template-${(updatedTemplate as any).uid}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Le parchemin a muté avec succès.',
      data: updatedTemplate
    }, { status: 200 });
  } catch (error: any) {
    const status = error instanceof IlotError ? error.status : 500;
    return NextResponse.json({ error: error.message || 'Erreur lors de la mise à jour.' }, { status });
  }
});

export const DELETE = withAura(async (_req: Request, context: ApiContext, _currentUser: OiseauUser) => {
  try {
    let resolvedParams;
    try {
      resolvedParams = await context.params;
      if (resolvedParams instanceof Promise) {
        resolvedParams = await resolvedParams;
      }
    } catch (err) {
      return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 });
    }
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 Utilisation de notre helper unifié pour cibler la suppression
    const targetTemplate: any = await findEntityBySlugOrUid(CVTemplateModel, identifier);
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
  } catch (error: any) {
    const status = error instanceof IlotError ? error.status : 500;
    return NextResponse.json({ error: error.message || 'Erreur lors de la suppression.' }, { status });
  }
});