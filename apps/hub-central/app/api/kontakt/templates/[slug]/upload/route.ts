export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { storageService } from '@/modules/storage/storage.service';
import { IlotError } from '@ilot/shared-core';
import { checkRateLimit } from '@/modules/security/rateLimiter';
import { slugify } from '@/lib/slugify';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// ==========================================
// 🚀 POST : Téléverser un aperçu graphique sur R2 (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: Request, context: ApiContext, _currentUser: OiseauUser) => {
  try {
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    
    // 🛡️ SUTURE DE SOUVERAINETÉ ABSOLUE : Protection anti-undefined et anti-plantage
    let rateLimitResult: { allowed?: boolean } = { allowed: true };
    try {
      const res = await checkRateLimit(`upload-kontakt:${clientIp}`, 10, 60);
      if (res && typeof res === 'object') {
        rateLimitResult = res;
      }
    } catch {
      rateLimitResult = { allowed: true };
    }
    
    if (rateLimitResult.allowed === false) {
      return NextResponse.json({ error: 'Trop de téléversements. Veuillez patienter.' }, { status: 429 });
    }

    const resolvedParams = await context.params;
    const rawSlug = (resolvedParams as any)?.slug;
    const slug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!slug) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: "Corps de requête multiphase illisible." }, { status: 400 });
    }

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

    return NextResponse.json({
      success: true,
      message: 'Parchemin du template scellé avec succès dans le Nexus R2.',
      data: {
        url: uploadResult.publicUrl,
        key: uploadResult.key,
      },
    }, { status: 201 });

  } catch (error: any) {
    console.error('🔥 [KONTAKT UPLOAD FATAL ERROR] :', error);
    const status = error instanceof IlotError ? error.status : 500;
    return NextResponse.json({ error: error.message || 'Erreur interne du serveur.' }, { status });
  }
});

// ==========================================
// 🗑️ DELETE : Désintégrer un artefact du Nexus R2 (Strictement Privé / Aura)
// ==========================================
export const DELETE = withAura(async (req: Request, context: ApiContext, _currentUser: OiseauUser) => {
  try {
    const resolvedParams = await context.params;
    const rawSlug = (resolvedParams as any)?.slug;
    const slug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!slug) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get('url');

    if (!fileUrl) {
      return NextResponse.json({ error: 'URL de l\'artefact à purger manquante.' }, { status: 400 });
    }

    const key = storageService.extractKeyFromUrl(fileUrl);
    await storageService.deleteFile(key);

    return NextResponse.json({ 
      success: true, 
      message: 'Parchemin désintégré du Nexus.' 
    }, { status: 200 });

  } catch (error: any) {
    console.error('🔥 [KONTAKT DELETE FATAL ERROR] :', error);
    const status = error instanceof IlotError ? error.status : 500;
    return NextResponse.json({ error: error.message || 'Erreur interne du serveur.' }, { status });
  }
});