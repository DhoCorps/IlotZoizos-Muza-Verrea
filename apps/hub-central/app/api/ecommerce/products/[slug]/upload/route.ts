export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { storageService } from '@/modules/storage/storage.service';
import { IlotError } from '@ilot/shared-core';
import { UniversalMediaRegistry } from '@ilot/infrastructure';
import { ProductModel } from '@ilot/infrastructure';
import { checkRateLimit } from '@/modules/security/rateLimiter';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// ==========================================
// 🚀 POST : Téléverser et Indexer une image de produit
// ==========================================
export const POST = withAura(async (req: Request, context: ApiContext, _currentUser: OiseauUser) => {
  try {
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    
    // 🛡️ SUTURE DE SOUVERAINETÉ ABSOLUE : Protection blindée anti-undefined et anti-plantage
    let rateLimitResult: { allowed?: boolean } = { allowed: true };
    try {
      const res = await checkRateLimit(`upload-product-slug:${clientIp}`, 10, 60);
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
      return NextResponse.json({ error: 'Paramètre de slug illisible.' }, { status: 400 });
    }

    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: 'Corps de requête multiphase illisible.' }, { status: 400 });
    }

    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'Aucune brindille (fichier) fournie.' }, { status: 400 });
    }

    const structuredKey = storageService.generateStructuredKey({
      inceptId: 'hub-central',
      locale: 'fr',
      entityType: 'projects',
      entityId: slug,
      imageType: 'product_image',
      filename: file.name,
    });

    const uploadResult = await storageService.uploadFile(file, structuredKey);

    // 🔄 SYNCHRONISATION : Indexation automatique dans le Registre Universel
    const product = await ProductModel.findOne({ slug });
    if (product) {
      await UniversalMediaRegistry.indexItem({
        mediaId: product.uid,
        sourceApp: 'DHO',
        ownerUid: product.ownerUid,
        ownerSlug: product.ownerSlug || 'marchand',
        title: product.title,
        mediaUrl: uploadResult.publicUrl,
        thumbnailUrl: uploadResult.publicUrl,
        priceCents: product.priceCents,
        consentForShowcase: !!product.settings?.consentForShowcase,
        consentForMusicSync: false,
        createdAt: new Date(),
      });
    }

    revalidateTag('products');
    revalidateTag(`product-${slug}`);

    return NextResponse.json({
      success: true,
      message: 'Illustration scellée et indexée dans la matrice.',
      data: { url: uploadResult.publicUrl, key: uploadResult.key },
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ [ECOMMERCE SLUG UPLOAD ERROR] :', error);
    const status = error instanceof IlotError ? error.status : 500;
    return NextResponse.json({ error: error.message || 'Erreur interne du serveur.' }, { status });
  }
});

// ==========================================
// 🗑️ DELETE : Purger et Désindexer l'image
// ==========================================
export const DELETE = withAura(async (req: Request, context: ApiContext, _currentUser: OiseauUser) => {
  try {
    const resolvedParams = await context.params;
    const rawSlug = (resolvedParams as any)?.slug;
    const slug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!slug) return NextResponse.json({ error: 'Slug invalide.' }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get('url');
    if (!fileUrl) return NextResponse.json({ error: 'URL manquante.' }, { status: 400 });

    const key = storageService.extractKeyFromUrl(fileUrl);
    await storageService.deleteFile(key);

    revalidateTag('products');
    revalidateTag(`product-${slug}`);

    return NextResponse.json({ success: true, message: 'Artefact produit désintégré.' }, { status: 200 });
  } catch (error: any) {
    const status = error instanceof IlotError ? error.status : 500;
    return NextResponse.json({ error: error.message || 'Erreur interne.' }, { status });
  }
});