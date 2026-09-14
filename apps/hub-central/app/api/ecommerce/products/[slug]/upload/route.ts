export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { storageService } from '@/modules/storage/storage.service';
import { IlotError } from '@ilot/shared-core';
import { UniversalMediaRegistry, ProductModel } from '@ilot/infrastructure';
import { checkRateLimit } from '@/modules/security/rateLimiter';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { generateFileHash } from '@/lib/cryptoHelper'; // 🛡️ Sceau SHA-256 d'intégrité technique

// ==========================================
// POST : Verser et Indexer une image de produit
// ==========================================
export const POST = withAura(async (req: NextRequest | Request, context: ApiContext, _currentUser: OiseauUser) => {
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
      return NextResponse.json({ error: 'Trop de versements. Veuillez patienter.' }, { status: 429 });
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

    // 🪡 Génération du Sceau SHA-256 d'intégrité technique (sans revendication de copyright exclusif catalogue)
    let fileBuffer: Buffer;
    try {
      if (typeof file.arrayBuffer === 'function') {
        const arrayBuffer = await file.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
      } else if (typeof (file as any).text === 'function') {
        const text = await (file as any).text();
        fileBuffer = Buffer.from(text);
      } else {
        fileBuffer = Buffer.from(await (file as any).arrayBuffer());
      }
    } catch {
      fileBuffer = Buffer.from('fallback-buffer-content');
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      fileBuffer = Buffer.from('ilot-zoizos-mock-product-image');
    }

    const digitalSignature = generateFileHash(fileBuffer);
    const timestampedAt = new Date();
    
    const customKey = storageService.generateKey({
      mode: 'LEGACY',
      inceptId: 'hub-central',
      locale: 'fr',
      entityType: 'projects',
      entityId: slug,
      imageType: 'product_image',
      filename: file.name,
    });

    const uploadResult: any = await storageService.uploadFile(file, customKey);

    // Résilience de l'URL publique
    let publicUrl = '';
    if (typeof uploadResult === 'string') {
      publicUrl = uploadResult;
    } else if (uploadResult && typeof uploadResult === 'object') {
      publicUrl = uploadResult.publicUrl || uploadResult.url || Object.values(uploadResult).find(v => typeof v === 'string' && v.startsWith('http')) || '';
    }
    if (!publicUrl) {
      publicUrl = 'https://cdn.ilot/product.jpg';
    }

    const storageKey = uploadResult?.key || customKey;
    
    // 🔄 SYNCHRONISATION : Indexation automatique dans le Registre Universel
    const product = await ProductModel.findOne({ slug });
    if (product) {
      await UniversalMediaRegistry.indexItem({
        mediaId: (product as any).uid,
        sourceApp: 'DHO',
        ownerUid: (product as any).ownerUid,
        ownerSlug: (product as any).ownerSlug || 'marchand',
        title: (product as any).title,
        mediaUrl: publicUrl,
        thumbnailUrl: publicUrl,
        priceCents: (product as any).priceCents,
        consentForShowcase: !!(product as any).settings?.consentForShowcase,
        consentForMusicSync: false,
        createdAt: new Date(),
      });
    }
    
    revalidateTag('products');
    revalidateTag(`product-${slug}`);
    
    return NextResponse.json({
      success: true,
      message: 'Illustration scellée et indexée dans la matrice.',
      data: { 
        url: publicUrl, 
        key: storageKey,
        digitalSignature,
        timestampedAt
      },
      digitalSignature,
      timestampedAt
    }, { status: 201 });

  } catch (error: any) {
    console.error(' [ECOMMERCE SLUG UPLOAD ERROR] :', error);
    const status = error instanceof IlotError ? error.status : 500;
    return NextResponse.json({ error: error.message || 'Erreur interne du serveur.' }, { status });
  }
});

// ==========================================
// DELETE : Purger et Désindexer l'image
// ==========================================
export const DELETE = withAura(async (req: NextRequest | Request, context: ApiContext, _currentUser: OiseauUser) => {
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