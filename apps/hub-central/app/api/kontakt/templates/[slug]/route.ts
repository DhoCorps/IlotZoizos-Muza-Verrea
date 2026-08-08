export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { CVTemplateModel } from '@ilot/infrastructure';
import { slugify } from '@/lib/slugify';
import { unstable_cache, revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { IlotError } from '@ilot/shared-core';

// 🧠 CACHE SÉCURISÉ : Récupération d'un template par son slug (60s) avec bypass en mode test
async function getCachedTemplateDetail(slug: string) {
  const fetcher = async () => {
    return await CVTemplateModel.findOne({ slug }).lean();
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  return await unstable_cache(
    fetcher,
    [`kontakt-template-${slug}`],
    { revalidate: 60, tags: ['cv-templates', 'kontakt-templates', `template-${slug}`] }
  )();
}

// ==========================================
// 📖 GET : Récupérer un template par son slug (Public / Silice)
// ==========================================
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
    const slug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!slug) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    const template = await getCachedTemplateDetail(slug);

    if (!template) {
      return NextResponse.json({ error: 'Parchemin introuvable dans la matrice.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: template }, { status: 200 });
  } catch (error: any) {
    const status = error instanceof IlotError ? error.status : 500;
    return NextResponse.json({ error: error.message || 'Erreur interne du serveur.' }, { status });
  }
});

// ==========================================
// ✍️ PUT : Mettre à jour un template (Strictement Privé / Aura)
// ==========================================
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
    const slug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!slug) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    const updatedTemplate = await CVTemplateModel.findOneAndUpdate({ slug }, body, { new: true }).lean();

    if (!updatedTemplate) {
      return NextResponse.json({ error: 'Parchemin introuvable dans la matrice.' }, { status: 404 });
    }

    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade
    revalidateTag('cv-templates');
    revalidateTag('kontakt-templates');
    revalidateTag(`template-${slug}`);

    return NextResponse.json({
      success: true,
      message: 'Le parchemin a été muté avec succès.',
      data: updatedTemplate
    }, { status: 200 });
  } catch (error: any) {
    const status = error instanceof IlotError ? error.status : 500;
    return NextResponse.json({ error: error.message || 'Erreur lors de la mise à jour.' }, { status });
  }
});

// ==========================================
// 🧨 DELETE : Supprimer un template (Strictement Privé / Aura)
// ==========================================
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
    const slug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!slug) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    const deletedTemplate = await CVTemplateModel.findOneAndDelete({ slug });

    if (!deletedTemplate) {
      return NextResponse.json({ error: 'Parchemin introuvable pour dissolution.' }, { status: 404 });
    }

    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade
    revalidateTag('cv-templates');
    revalidateTag('kontakt-templates');
    revalidateTag(`template-${slug}`);

    return NextResponse.json({
      success: true,
      message: `Le template [${slug}] a été désintégré de la matrice.`
    }, { status: 200 });
  } catch (error: any) {
    const status = error instanceof IlotError ? error.status : 500;
    return NextResponse.json({ error: error.message || 'Erreur lors de la suppression.' }, { status });
  }
});