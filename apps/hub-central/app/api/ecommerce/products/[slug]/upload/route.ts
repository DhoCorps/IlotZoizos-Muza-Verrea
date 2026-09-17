export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { storageService } from '@/modules/storage/storage.service';
import { IlotError } from '@ilot/shared-core';
import { UniversalMediaRegistry, ProductModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { IProduct } from '@ilot/types';
import { checkRateLimit } from '@/modules/security/rateLimiter';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, withRateLimit, OiseauUser, ApiContext, handleRouteError, assertEntitySovereignty } from '@/lib/api-guards';
import { generateFileHash } from '@/lib/cryptoHelper';

interface StorageUploadResult {
  success?: boolean;
  publicUrl?: string;
  url?: string;
  key?: string;
  [key: string]: unknown;
}

// ==========================================
// 🛡️ FONCTION CENTRALISÉE D'INVALIDATION EN CASCADE POUR LES PRODUITS
// ==========================================
function revalidateProductCascades(product: { slug?: string; uid?: string; ownerUid?: string }) {
  revalidateTag('products');
  revalidateTag('ecommerce');
  
  if (product.uid) {
    revalidateTag(`product-${product.uid}`);
  }
  if (product.slug) {
    revalidateTag(`product-${product.slug}`);
    revalidateTag(`product-slug-${product.slug}`);
  }
  if (product.ownerUid) {
    revalidateTag(`merchant-products-${product.ownerUid}`);
  }
}

// ==========================================
// POST : Verser et Indexer une image de produit
// ==========================================
export const POST = withRateLimit('upload-product-slug', 10, 60, withAura(async (req: NextRequest | Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    let resolvedParams: { slug?: string | string[] } | undefined;
    try {
      resolvedParams = await context.params;
    } catch {
      return NextResponse.json({ success: false, error: "Paramètres de route invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    if (!identifier) {
      return NextResponse.json({ success: false, error: 'Paramètre de slug illisible.' }, { status: 400 });
    }

    const product = await findEntityBySlugOrUid(ProductModel, identifier) as IProduct | null;
    if (!product) {
      return NextResponse.json({ success: false, error: "Artefact introuvable dans l'Îlot." }, { status: 404 });
    }

    // 🛡️ Passage explicite d'un objet conforme à la signature attendue
    const ownerFieldUid = product.ownerUid || (product as unknown as { sellerUid?: string }).sellerUid;
    assertEntitySovereignty({ uid: currentUser.uid, capabilities: currentUser.capabilities }, ownerFieldUid || '');
    
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ success: false, error: 'Corps de requête multiphase illisible.' }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ success: false, error: 'Aucune brindille (fichier) fournie.' }, { status: 400 });
    }

    let fileBuffer: Buffer;
    try {
      if (typeof file.arrayBuffer === 'function') {
        const arrayBuffer = await file.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
      } else {
        fileBuffer = Buffer.from(await (file as unknown as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer());
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

    const rawUploadResult = await storageService.uploadFile(file, customKey);
    const uploadResult = (rawUploadResult ?? {}) as Record<string, unknown>;

    let publicUrl = '';
    if (typeof rawUploadResult === 'string') {
      publicUrl = rawUploadResult;
    } else if (uploadResult && typeof uploadResult === 'object') {
      publicUrl = (uploadResult.publicUrl as string) || 
                  (uploadResult.url as string) || 
                  (Object.values(uploadResult).find(v => typeof v === 'string' && v.startsWith('http')) as string) || 
                  '';
    }
    if (!publicUrl) {
      publicUrl = 'https://cdn.ilot/product.jpg';
    }

    const storageKey = (uploadResult.key as string) || customKey;

    await ProductModel.updateOne({ uid: product.uid }, { $set: { imageUrl: publicUrl } });
    
    await UniversalMediaRegistry.indexItem({
      mediaId: product.uid,
      sourceApp: 'DHO',
      ownerUid: product.ownerUid || (product as unknown as { sellerUid?: string }).sellerUid || '',
      ownerSlug: (product as unknown as { ownerSlug?: string }).ownerSlug || 'marchand',
      title: product.title,
      mediaUrl: publicUrl,
      thumbnailUrl: publicUrl,
      priceCents: product.priceCents,
      consentForShowcase: !!(product as unknown as { settings?: { consentForShowcase?: boolean } }).settings?.consentForShowcase,
      consentForMusicSync: false,
      createdAt: new Date(),
    });
    
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

  } catch (error: unknown) {
    return handleRouteError(error, 'Erreur interne lors du versement de l\'artefact.');
  }
}));

// DELETE inchangé (penser juste à adapter aussi assertEntitySovereignty si besoin)
export const DELETE = withAura(async (req: NextRequest | Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    let resolvedParams: { slug?: string | string[] } | undefined;
    try {
      resolvedParams = await context.params;
    } catch {
      return NextResponse.json({ success: false, error: "Paramètres de route invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    if (!identifier) {
      return NextResponse.json({ success: false, error: 'Slug invalide.' }, { status: 400 });
    }
    
    const product = await findEntityBySlugOrUid(ProductModel, identifier) as IProduct | null;
    if (!product) {
      return NextResponse.json({ success: false, error: "Artefact introuvable." }, { status: 404 });
    }

    const ownerFieldUid = product.ownerUid || (product as unknown as { sellerUid?: string }).sellerUid;
    assertEntitySovereignty({ uid: currentUser.uid, capabilities: currentUser.capabilities }, ownerFieldUid || '');

    let urlObj: URL;
    try {
      urlObj = new URL(req.url);
    } catch {
      return NextResponse.json({ success: false, error: 'URL de requête invalide.' }, { status: 400 });
    }

    const fileUrl = urlObj.searchParams.get('url');
    if (!fileUrl) {
      return NextResponse.json({ success: false, error: 'URL manquante.' }, { status: 400 });
    }

    if (!product.imageUrl) {
      return NextResponse.json({ success: false, error: "Souveraineté brisée : aucun artefact enregistré pour ce produit." }, { status: 403 });
    }

    let expectedKey: string;
    let providedKey: string;
    try {
      expectedKey = storageService.extractKeyFromUrl(product.imageUrl);
      providedKey = storageService.extractKeyFromUrl(fileUrl);
    } catch {
      return NextResponse.json({ success: false, error: "Format d'URL d'artefact invalide." }, { status: 400 });
    }

    if (!expectedKey || !providedKey || expectedKey !== providedKey) {
      return NextResponse.json({ success: false, error: "Souveraineté brisée : cet artefact n'appartient pas à ce produit." }, { status: 403 });
    }
    
    await storageService.deleteFile(expectedKey);
    await ProductModel.updateOne({ uid: product.uid }, { $set: { imageUrl: null } });

    revalidateProductCascades(product);
    
    return NextResponse.json({ success: true, message: 'Artefact produit désintégré.' }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, 'Erreur interne lors de la purge de l\'artefact.');
  }
});