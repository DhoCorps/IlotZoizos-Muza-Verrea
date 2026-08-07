import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from '@ilot/infrastructure';
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
      console.error("🔥 [SESSION ERROR KONTAKT TEMPLATE UPLOAD]", sessionErr);
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Accès non autorisé.' }, { status: 401 });
    }

    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    let rateLimitResult;
    try {
      rateLimitResult = await checkRateLimit(`upload-kontakt:${clientIp}`, 10, 60);
    } catch (rateErr) {
      console.error("⚠️ [RATE LIMIT ERROR KONTAKT UPLOAD]", rateErr);
      rateLimitResult = { allowed: true };
    }

    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Trop de téléversements. Veuillez patienter.' }, { status: 429 });
    }

    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR KONTAKT TEMPLATE UPLOAD]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let slug;
    try {
      const resolvedParams = await params;
      slug = slugify(resolvedParams.slug || '');
    } catch (paramsErr) {
      console.error("🔥 [PARAMS ERROR KONTAKT TEMPLATE UPLOAD]", paramsErr);
      return NextResponse.json({ error: "Paramètre de slug illisible." }, { status: 400 });
    }

    let formData;
    try {
      formData = await req.formData();
    } catch (formErr) {
      console.error("🔥 [FORM DATA ERROR KONTAKT TEMPLATE UPLOAD]", formErr);
      return NextResponse.json({ error: "Corps de requête multiphase illisible." }, { status: 400 });
    }

    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'Aucun parchemin graphique fourni.' }, { status: 400 });
    }

    let structuredKey;
    try {
      structuredKey = storageService.generateStructuredKey({
        inceptId: 'hub-central',
        locale: 'fr',
        entityType: 'projects',
        entityId: slug,
        imageType: 'cv_template_preview',
        filename: file.name,
      });
    } catch (keyErr) {
      console.error("🔥 [STRUCTURED KEY ERROR]", keyErr);
      return NextResponse.json({ error: "Échec de la génération de la clé de stockage." }, { status: 500 });
    }

    let uploadResult;
    try {
      uploadResult = await storageService.uploadFile(file, structuredKey);
    } catch (uploadErr) {
      console.error("🔥 [STORAGE UPLOAD ERROR]", uploadErr);
      return NextResponse.json({ error: "Échec du scellement du fichier dans le Nexus R2." }, { status: 500 });
    }

    console.log(`📜 [Kontakt] Aperçu/Parchemin ancré pour le template [slug: ${slug}] : ${uploadResult.publicUrl}`);

    return NextResponse.json({
      success: true,
      message: 'Parchemin du template scellé avec succès dans le Nexus R2.',
      data: {
        url: uploadResult.publicUrl,
        key: uploadResult.key,
      },
    }, { status: 201 });

  } catch (error: any) {
    console.error('🔥 [KONTAKT SLUG UPLOAD FATAL ERROR] :', error);
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
      console.error("🔥 [SESSION ERROR KONTAKT TEMPLATE DELETE]", sessionErr);
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Accès non autorisé.' }, { status: 401 });
    }

    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR KONTAKT TEMPLATE DELETE]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let slug;
    try {
      const resolvedParams = await params;
      slug = slugify(resolvedParams.slug || '');
    } catch (paramsErr) {
      console.error("🔥 [PARAMS ERROR KONTAKT TEMPLATE DELETE]", paramsErr);
      return NextResponse.json({ error: "Paramètre de slug illisible." }, { status: 400 });
    }

    let fileUrl;
    try {
      const { searchParams } = new URL(req.url);
      fileUrl = searchParams.get('url');
    } catch (urlErr) {
      console.error("🔥 [URL PARSE ERROR]", urlErr);
      return NextResponse.json({ error: "URL de requête invalide." }, { status: 400 });
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

    console.log(`🗑️ [Kontakt] Parchemin purgé pour le template [slug: ${slug}]`);

    return NextResponse.json({ 
      success: true, 
      message: 'Parchemin désintégré du Nexus.' 
    }, { status: 200 });

  } catch (error: any) {
    console.error('🔥 [KONTAKT SLUG DELETE FATAL ERROR] :', error);
    const status = error instanceof IlotError ? error.status : 500;
    return NextResponse.json({ error: error.message || 'Erreur interne du serveur.' }, { status });
  }
}