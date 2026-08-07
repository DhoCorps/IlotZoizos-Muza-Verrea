import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { storageService } from '@/modules/storage/storage.service';
import { IlotError } from '@ilot/shared-core';
import { checkRateLimit } from '@/modules/security/rateLimiter';
import { slugify } from '@/lib/slugify';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR PRODUCT SLUG UPLOAD]", sessionErr);
      return NextResponse.json({ error: 'Erreur de session.' }, { status: 500 });
    }

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Accès non autorisé.' }, { status: 401 });
    }

    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    let rateLimitResult;
    try {
      rateLimitResult = await checkRateLimit(`upload-product-slug:${clientIp}`, 10, 60);
    } catch (rateErr) {
      console.error("⚠️ [RATE LIMIT ERROR PRODUCT UPLOAD]", rateErr);
      rateLimitResult = { allowed: true };
    }

    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Trop de téléversements. Veuillez patienter.' }, { status: 429 });
    }

    let rawSlug;
    try {
      const resolvedParams = await params;
      rawSlug = resolvedParams.slug;
    } catch (paramsErr) {
      console.error("🔥 [PARAMS ERROR PRODUCT UPLOAD]", paramsErr);
      return NextResponse.json({ error: 'Paramètre de slug illisible.' }, { status: 400 });
    }

    const slug = slugify(rawSlug || '');

    let formData;
    try {
      formData = await req.formData();
    } catch (formErr) {
      console.error("🔥 [FORM DATA ERROR PRODUCT UPLOAD]", formErr);
      return NextResponse.json({ error: 'Corps de requête multiphase illisible.' }, { status: 400 });
    }

    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'Aucune brindille (fichier) fournie.' }, { status: 400 });
    }

    let structuredKey;
    try {
      structuredKey = storageService.generateStructuredKey({
        inceptId: 'hub-central',
        locale: 'fr',
        entityType: 'projects',
        entityId: slug,
        imageType: 'product_image',
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

    console.log(`🛍️ [Ecommerce] Image ancrée pour le produit [slug: ${slug}] : ${uploadResult.publicUrl}`);

    return NextResponse.json({
      success: true,
      message: 'Illustration du produit scellée avec succès via son slug.',
      data: {
        url: uploadResult.publicUrl,
        key: uploadResult.key,
      },
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ [ECOMMERCE SLUG UPLOAD ERROR] :', error);
    const status = error instanceof IlotError ? error.status : 500;
    return NextResponse.json({ error: error.message || 'Erreur interne du serveur.' }, { status });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR PRODUCT SLUG DELETE]", sessionErr);
      return NextResponse.json({ error: 'Erreur de session.' }, { status: 500 });
    }

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Accès non autorisé.' }, { status: 401 });
    }

    let rawSlug;
    try {
      const resolvedParams = await params;
      rawSlug = resolvedParams.slug;
    } catch (paramsErr) {
      console.error("🔥 [PARAMS ERROR PRODUCT DELETE]", paramsErr);
      return NextResponse.json({ error: 'Paramètre de slug illisible.' }, { status: 400 });
    }

    const slug = slugify(rawSlug || '');

    let fileUrl;
    try {
      const { searchParams } = new URL(req.url);
      fileUrl = searchParams.get('url');
    } catch (urlErr) {
      console.error("🔥 [URL PARSE ERROR]", urlErr);
      return NextResponse.json({ error: 'URL de requête invalide.' }, { status: 400 });
    }

    if (!fileUrl) {
      return NextResponse.json({ error: 'URL de l\'artefact à purger manquante.' }, { status: 400 });
    }

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

    console.log(`🗑️ [Ecommerce] Artefact purgé pour le produit [slug: ${slug}]`);

    return NextResponse.json({ success: true, message: 'Artefact produit désintégré.' }, { status: 200 });

  } catch (error: any) {
    console.error('❌ [ECOMMERCE SLUG DELETE FATAL ERROR] :', error);
    const status = error instanceof IlotError ? error.status : 500;
    return NextResponse.json({ error: error.message || 'Erreur interne du serveur.' }, { status });
  }
}