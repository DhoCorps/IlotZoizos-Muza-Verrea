// apps/hub-central/app/api/kontakt/templates/[slug]/upload/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../../lib/auth';
import { storageService } from '../../../../../../modules/storage/storage.service';
import { IlotError } from '@ilot/shared-core';
import { checkRateLimit } from '../../../../../../modules/security/rateLimiter';

export async function POST(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Accès non autorisé.' }, { status: 401 });
    }

    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const { allowed } = await checkRateLimit(`upload-kontakt:${clientIp}`, 10, 60);
    if (!allowed) {
      return NextResponse.json({ error: 'Trop de téléversements. Veuillez patienter.' }, { status: 429 });
    }

    const { slug } = params;
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Aucun parchemin graphique fourni.' }, { status: 400 });
    }

    const structuredKey = storageService.generateStructuredKey({
      inceptId: 'hub-central',
      locale: 'fr',
      entityType: 'projects',
      entityId: slug,
      imageType: 'cv_template_preview',
      filename: file.name,
    });

    const uploadResult = await storageService.uploadFile(file, structuredKey);

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
    console.error('❌ [KONTAKT SLUG UPLOAD ERROR] :', error);
    const status = error instanceof IlotError ? error.status : 500;
    return NextResponse.json({ error: error.message || 'Erreur interne du serveur.' }, { status });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Accès non autorisé.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get('url');

    if (!fileUrl) {
      return NextResponse.json({ error: 'URL de l\'artefact à purger manquante.' }, { status: 400 });
    }

    const key = storageService.extractKeyFromUrl(fileUrl);
    await storageService.deleteFile(key);

    console.log(`🗑️ [Kontakt] Parchemin purgé pour le template [slug: ${params.slug}]`);

    return NextResponse.json({ success: true, message: 'Parchemin désintégré du Nexus.' }, { status: 200 });

  } catch (error: any) {
    const status = error instanceof IlotError ? error.status : 500;
    return NextResponse.json({ error: error.message || 'Erreur interne du serveur.' }, { status });
  }
}