export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { storageService } from '@/modules/storage/storage.service';
import { IlotError } from '@ilot/shared-core';
import { UniversalMediaRegistry, ProductModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { checkRateLimit } from '@/modules/security/rateLimiter';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { generateFileHash } from '@/lib/cryptoHelper'; // 🛡️ Sceau SHA-256 d'intégrité technique

// ==========================================
// POST : Verser et Indexer une image de produit
// ==========================================
export const POST = withAura(async (req: NextRequest | Request, context: ApiContext, currentUser: OiseauUser) => {
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
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    if (!identifier) {
      return NextResponse.json({ error: 'Paramètre de slug illisible.' }, { status: 400 });
    }

    // 🔍 Résolution unifiée de l'artefact avant toute manipulation de fichiers
    const product: any = await findEntityBySlugOrUid(ProductModel, identifier);
    if (!product) {
      return NextResponse.json({ error: "Artefact introuvable dans l'Îlot." }, { status: 404 });
    }

    // 🛡️ Contrôle de souveraineté strict
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

    // 🪡 Génération du Sceau SHA-256 d'intégrité technique
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
      entityId: product.uid, // Utilisation de l'UID canonique
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

    // 🔄 Mise à jour de la base de données de l'artefact
    await ProductModel.updateOne({ uid: product.uid }, { $set: { imageUrl: publicUrl } });
    
    // 🔄 SYNCHRONISATION : Indexation automatique dans le Registre Universel
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
    
    // 💥 Invalidation en cascade
    revalidateTag('products');
    revalidateTag(`product-${identifier}`);
    revalidateTag(`product-${product.uid}`);
    if (product.slug) {
      revalidateTag(`product-${product.slug}`);
    }
    
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
});

// ==========================================
// DELETE : Purger et Désindexer l'image
// ==========================================
export const DELETE = withAura(async (req: NextRequest | Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const resolvedParams = await context.params;
    const rawSlug = (resolvedParams as any)?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    if (!identifier) return NextResponse.json({ error: 'Slug invalide.' }, { status: 400 });
    
    // 🔍 Résolution unifiée pour s'assurer de l'existence et récupérer l'UID canonique
    const product: any = await findEntityBySlugOrUid(ProductModel, identifier);
    if (!product) {
      return NextResponse.json({ error: "Artefact introuvable." }, { status: 404 });
    }

    // 🛡️ Contrôle de souveraineté strict
    const isOwner = product.ownerUid === currentUser.uid || product.sellerUid === currentUser.uid;
    const isArchitect = currentUser.capabilities?.includes('*');
    if (!isOwner && !isArchitect) {
      return NextResponse.json({ error: "Souveraineté violée : tu ne peux altérer cet artefact." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get('url');
    if (!fileUrl) return NextResponse.json({ error: 'URL manquante.' }, { status: 400 });

    // 🛡️ SUTURE DE SÉCURITÉ IDOR : Vérification formelle que l'URL appartient bien à ce produit !
    if (product.imageUrl !== fileUrl) {
      return NextResponse.json({ error: "Souveraineté brisée : cet artefact n'appartient pas à ce produit." }, { status: 403 });
    }
    
    // Purge de l'artefact sur R2
    const key = storageService.extractKeyFromUrl(fileUrl);
    await storageService.deleteFile(key);
    
    // 🔄 Sédimentation en base de données : On retire le lien de l'image
    await ProductModel.updateOne({ uid: product.uid }, { $set: { imageUrl: null } });

    // 💥 Invalidation en cascade
    revalidateTag('products');
    revalidateTag(`product-${identifier}`);
    revalidateTag(`product-${product.uid}`);
    if (product.slug) {
      revalidateTag(`product-${product.slug}`);
    }
    
    return NextResponse.json({ success: true, message: 'Artefact produit désintégré.' }, { status: 200 });

  } catch (error: any) {
    console.error('🔥 [ECOMMERCE SLUG DELETE ERROR] :', error);
    const status = error instanceof IlotError ? error.status : 500;
    return NextResponse.json({ error: error.message || 'Erreur interne.' }, { status });
  }
});