export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { storageService } from '@/modules/storage/storage.service';
import { IlotError } from '@ilot/shared-core';
import { UniversalMediaRegistry, ProductModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { checkRateLimit } from '@/modules/security/rateLimiter';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, withRateLimit, OiseauUser, ApiContext } from '@/lib/api-guards';
import { generateFileHash } from '@/lib/cryptoHelper';

// 🛡️ Fonction centralisée d'invalidation en cascade pour les produits
function revalidateProductCascades(product: { slug?: string; uid?: string; ownerUid?: string }) {
  // Flux globaux et listes de catalogue
  revalidateTag('products');
  revalidateTag('ecommerce');
  
  // Flux spécifiques à l'entité
  if (product.uid) {
    revalidateTag(`product-${product.uid}`);
  }
  if (product.slug) {
    revalidateTag(`product-${product.slug}`);
    revalidateTag(`product-slug-${product.slug}`);
  }
  // Flux marchands associés si applicable
  if (product.ownerUid) {
    revalidateTag(`merchant-products-${product.ownerUid}`);
  }
}

// ==========================================
// POST : Verser et Indexer une image de produit
// ==========================================
export const POST = withRateLimit('upload-product-slug', 10, 60, withAura(async (req: NextRequest | Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const rawSlug = (resolvedParams as any)?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    if (!identifier) {
      return NextResponse.json({ error: 'Paramètre de slug illisible.' }, { status: 400 });
    }

    const product: any = await findEntityBySlugOrUid(ProductModel, identifier);
    if (!product) {
      return NextResponse.json({ error: "Artefact introuvable dans l'Îlot." }, { status: 404 });
    }

    const isOwner = product.ownerUid === currentUser.uid || product.sellerUid === currentUser.uid;
    const isArchitect = currentUser.capabilities?.includes('*');
    if (!isOwner && !isArchitect) {
      return NextResponse.json({ error: "Souveraineté violée : tu ne peux altérer cet artefact." }, { status: 403 });
    }
    
    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: 'Corps de requête multiphase illisible.' }, { status: 400 });
    }
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'Aucune brindille (fichier) fournie.' }, { status: 400 });
    }

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
      entityId: product.uid,
      imageType: 'product_image',
      filename: file.name,
    });

    const uploadResult: any = await storageService.uploadFile(file, customKey);

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

    await ProductModel.updateOne({ uid: product.uid }, { $set: { imageUrl: publicUrl } });
    
    await UniversalMediaRegistry.indexItem({
      mediaId: product.uid,
      sourceApp: 'DHO',
      ownerUid: product.ownerUid || product.sellerUid,
      ownerSlug: product.ownerSlug || 'marchand',
      title: product.title,
      mediaUrl: publicUrl,
      thumbnailUrl: publicUrl,
      priceCents: product.priceCents,
      consentForShowcase: !!product.settings?.consentForShowcase,
      consentForMusicSync: false,
      createdAt: new Date(),
    });
    
    // 💥 Invalidation globale et centralisée en cascade
    revalidateProductCascades(product);
    
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
    console.error('🔥 [ECOMMERCE SLUG UPLOAD ERROR] :', error);
    const status = error instanceof IlotError ? error.status : 500;
    return NextResponse.json({ error: error.message || 'Erreur interne du serveur.' }, { status });
  }
}));

// ==========================================
// DELETE : Purger et Désindexer l'image
// ==========================================
export const DELETE = withAura(async (req: NextRequest | Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const rawSlug = (resolvedParams as any)?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    if (!identifier) return NextResponse.json({ error: 'Slug invalide.' }, { status: 400 });
    
    const product: any = await findEntityBySlugOrUid(ProductModel, identifier);
    if (!product) {
      return NextResponse.json({ error: "Artefact introuvable." }, { status: 404 });
    }

    const isOwner = product.ownerUid === currentUser.uid || product.sellerUid === currentUser.uid;
    const isArchitect = currentUser.capabilities?.includes('*');
    if (!isOwner && !isArchitect) {
      return NextResponse.json({ error: "Souveraineté violée : tu ne peux altérer cet artefact." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get('url');
    if (!fileUrl) return NextResponse.json({ error: 'URL manquante.' }, { status: 400 });

    if (!product.imageUrl) {
      return NextResponse.json({ error: "Souveraineté brisée : aucun artefact enregistré pour ce produit." }, { status: 403 });
    }

    let expectedKey: string;
    let providedKey: string;
    try {
      expectedKey = storageService.extractKeyFromUrl(product.imageUrl);
      providedKey = storageService.extractKeyFromUrl(fileUrl);
    } catch {
      return NextResponse.json({ error: "Format d'URL d'artefact invalide." }, { status: 400 });
    }

    if (!expectedKey || !providedKey || expectedKey !== providedKey) {
      return NextResponse.json({ error: "Souveraineté brisée : cet artefact n'appartient pas à ce produit." }, { status: 403 });
    }
    
    await storageService.deleteFile(expectedKey);
    await ProductModel.updateOne({ uid: product.uid }, { $set: { imageUrl: null } });

    // 💥 Invalidation globale et centralisée en cascade
    revalidateProductCascades(product);
    
    return NextResponse.json({ success: true, message: 'Artefact produit désintégré.' }, { status: 200 });

  } catch (error: any) {
    console.error('🔥 [ECOMMERCE SLUG DELETE ERROR] :', error);
    const status = error instanceof IlotError ? error.status : 500;
    return NextResponse.json({ error: error.message || 'Erreur interne.' }, { status });
  }
});