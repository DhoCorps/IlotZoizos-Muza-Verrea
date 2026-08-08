import { NextResponse } from 'next/server';
import { storageService } from '@/modules/storage/storage.service';
import { checkRateLimit } from '@/modules/security/rateLimiter';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { IlotError } from '@ilot/shared-core';

export const dynamic = 'force-dynamic';

// ==========================================
// 📤 POST : Téléversement de média pour un Sujet
// ==========================================
export const POST = withAura(async (req: Request, context: ApiContext, _currentUser: OiseauUser) => {
  try {
    // 1. Rate Limiting par IP
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    let rateLimitResult;
    try {
      rateLimitResult = await checkRateLimit(`upload-sujet-slug:${clientIp}`, 10, 60);
    } catch (rateErr) {
      console.error("⚠️ [RATE LIMIT ERROR ABYSS UPLOAD]", rateErr);
      rateLimitResult = { allowed: true };
    }

    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Trop de téléversements. Veuillez patienter.' }, { status: 429 });
    }

    // 2. Résolution stricte et typée du slug
    const resolvedParams = await context.params;
    const rawSlug = resolvedParams?.slug;
    const slug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    // 3. Récupération et validation du formulaire multipart
    let formData;
    try {
      formData = await req.formData();
    } catch (formErr) {
      console.error("🔥 [FORM DATA ERROR ABYSS UPLOAD]", formErr);
      return NextResponse.json({ error: 'Corps de requête multiphase illisible.' }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Aucun média fourni.' }, { status: 400 });
    }

    // 4. Génération de la clé structurée et upload vers le stockage R2
    let structuredKey;
    try {
      structuredKey = storageService.generateStructuredKey({
        inceptId: 'hub-central',
        locale: 'fr',
        entityType: 'projects',
        entityId: slug,
        imageType: 'sujet_media',
        filename: file.name,
      });
    } catch (keyErr) {
      console.error("🔥 [STRUCTURED KEY ERROR]", keyErr);
      return NextResponse.json({ error: 'Échec de la génération de la clé de stockage.' }, { status: 500 });
    }

    let uploadResult;
    try {
      uploadResult = await storageService.uploadFile(file, structuredKey);
    } catch (uploadErr) {
      console.error("🔥 [STORAGE UPLOAD ERROR]", uploadErr);
      return NextResponse.json({ error: 'Échec du scellement du fichier dans le Nexus R2.' }, { status: 500 });
    }

    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade pour ce sujet
    revalidateTag('sujets');
    revalidateTag(`sujet-${slug}`);

    console.log(`📜 [Abyss] Média ancré pour le sujet [slug: ${slug}] : ${uploadResult.publicUrl}`);

    return NextResponse.json({
      success: true,
      message: 'Média du sujet scellé avec succès dans le Nexus R2.',
      data: {
        url: uploadResult.publicUrl,
        key: uploadResult.key,
      },
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ [ABYSS SLUG UPLOAD FATAL ERROR] :', error);
    const status = error instanceof IlotError ? error.status : 500;
    return NextResponse.json({ error: error.message || 'Erreur interne du serveur.' }, { status });
  }
});

// ==========================================
// 🗑️ DELETE : Purge de média pour un Sujet
// ==========================================
export const DELETE = withAura(async (req: Request, context: ApiContext, _currentUser: OiseauUser) => {
  try {
    // 1. Résolution du slug
    const resolvedParams = await context.params;
    const rawSlug = resolvedParams?.slug;
    const slug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    // 2. Extraction de l'URL du fichier depuis les paramètres de recherche
    let fileUrl;
    try {
      const { searchParams } = new URL(req.url);
      fileUrl = searchParams.get('url');
    } catch (urlErr) {
      console.error("🔥 [URL PARSE ERROR]", urlErr);
      return NextResponse.json({ error: 'URL de requête invalide.' }, { status: 400 });
    }

    if (!fileUrl) {
      return NextResponse.json({ error: "URL de l'artefact à purger manquante." }, { status: 400 });
    }

    // 3. Extraction de la clé et désintégration du fichier
    let key;
    try {
      key = storageService.extractKeyFromUrl(fileUrl);
    } catch (extractErr) {
      console.error("🔥 [EXTRACT KEY ERROR]", extractErr);
      return NextResponse.json({ error: "Échec de l'extraction de la clé d'artefact." }, { status: 400 });
    }

    try {
      await storageService.deleteFile(key);
    } catch (deleteErr) {
      console.error("🔥 [STORAGE DELETE ERROR]", deleteErr);
      return NextResponse.json({ error: "Échec de la désintégration de l'artefact dans le Nexus." }, { status: 500 });
    }

    // 💥 BOOM ! Invalidation chirurgicale du cache
    revalidateTag('sujets');
    revalidateTag(`sujet-${slug}`);

    console.log(`🗑️ [Abyss] Média purgé pour le sujet [slug: ${slug}]`);

    return NextResponse.json({ success: true, message: 'Média désintégré du Nexus.' }, { status: 200 });

  } catch (error: any) {
    console.error('❌ [ABYSS SLUG DELETE FATAL ERROR] :', error);
    const status = error instanceof IlotError ? error.status : 500;
    return NextResponse.json({ error: error.message || 'Erreur interne du serveur.' }, { status });
  }
});