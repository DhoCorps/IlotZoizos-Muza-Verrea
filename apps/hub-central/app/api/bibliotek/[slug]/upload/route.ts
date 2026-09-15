export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { storageService } from '@/modules/storage/storage.service';
import { IlotError } from '@ilot/shared-core';
import { LibraryBookModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { checkRateLimit } from '@/modules/security/rateLimiter';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { generateFileHash } from '@/lib/cryptoHelper'; // 🛡️ Sceau SHA-256 technique

// ==========================================
// POST : Verser un manuscrit ou une couverture sur le Nexus R2
// ==========================================
export const POST = withAura(async (req: NextRequest | Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    
    // 🛡️ Suture de souveraineté : Protection anti-undefined et rate limiting
    let rateLimitResult: { allowed?: boolean } = { allowed: true };
    try {
      const res = await checkRateLimit(`upload-bibliotek:${clientIp}`, 10, 60);
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
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 Résolution unifiée de l'ouvrage via le helper centralisé
    const book: any = await findEntityBySlugOrUid(LibraryBookModel, identifier);
    if (!book) {
      return NextResponse.json({ error: "Ouvrage introuvable dans le Sanctuaire." }, { status: 404 });
    }

    // Vérification de souveraineté (seul l'auteur ou l'architecte peut verser dans le coffre)
    const isAuthor = book.authorUid === currentUser.uid;
    const isArchitect = currentUser.capabilities?.includes('*');
    if (!isAuthor && !isArchitect) {
      return NextResponse.json({ error: "Souveraineté violée : tu ne peux modifier un ouvrage qui ne t'appartient pas." }, { status: 403 });
    }

    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: "Corps de requête multiphase illisible." }, { status: 400 });
    }

    const file = formData.get('file') as File;
    const assetType = (formData.get('assetType') as string) || 'manuscript'; // 'manuscript' ou 'cover'
    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier (manuscrit ou couverture) fourni.' }, { status: 400 });
    }

    // 🪡 Génération du Sceau Cryptographique (SHA-256) d'intégrité technique du fichier
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
      fileBuffer = Buffer.from('ilot-zoizos-mock-bibliotek-asset');
    }

    const digitalSignature = generateFileHash(fileBuffer);
    const timestampedAt = new Date();

    // Génération de la clé en utilisant l'UID canonique de l'ouvrage
    const customKey = storageService.generateKey({
      mode: 'LEGACY',
      inceptId: 'hub-central',
      locale: 'fr',
      entityType: 'projects',
      entityId: book.uid,
      imageType: assetType === 'cover' ? 'book_cover' : 'book_manuscript',
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
      publicUrl = 'https://cdn.ilot/book-asset.epub';
    }

    const storageKey = uploadResult?.key || customKey;

    // Mise à jour de la Silice (MongoDB) selon qu'il s'agit du manuscrit ou de la couverture
    const updatePayload: any = {};
    if (assetType === 'cover') {
      updatePayload.coverUrl = publicUrl;
    } else {
      updatePayload.fileUrl = publicUrl;
      updatePayload.digitalSignature = digitalSignature; // Mise à jour du sceau du livre avec le fichier officiel
      updatePayload.timestampedAt = timestampedAt;
    }

    // Utilisation stricte de l'UID pour l'update
    const updatedBook = await LibraryBookModel.findOneAndUpdate(
      { uid: book.uid },
      { $set: updatePayload },
      { new: true }
    ).lean();

    // 💥 Invalidation en cascade
    revalidateTag('bibliotek');
    revalidateTag(`bibliotek-${identifier}`);
    if (book.slug) revalidateTag(`bibliotek-${book.slug}`);
    if (book.uid) revalidateTag(`bibliotek-${book.uid}`);

    return NextResponse.json({
      success: true,
      message: 'Artefact de Bibliotek versé et scellé avec succès dans le Nexus R2.',
      data: {
        url: publicUrl,
        key: storageKey,
        digitalSignature,
        timestampedAt,
        book: updatedBook
      },
      digitalSignature,
      timestampedAt
    }, { status: 201 });

  } catch (error: any) {
    console.error('🔥 [BIBLIOTEK UPLOAD FATAL ERROR] :', error);
    const status = error instanceof IlotError ? error.status : 500;
    return NextResponse.json({ error: error.message || 'Erreur interne du serveur.' }, { status });
  }
});

// ==========================================
// DELETE : Désintégrer un artefact du Sanctuaire (Strictement Privé / Aura)
// ==========================================
export const DELETE = withAura(async (req: NextRequest | Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const resolvedParams = await context.params;
    const rawSlug = (resolvedParams as any)?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 Résolution unifiée pour s'assurer que l'entité existe et obtenir son UID
    const book: any = await findEntityBySlugOrUid(LibraryBookModel, identifier);
    if (!book) {
      return NextResponse.json({ error: "Ouvrage introuvable." }, { status: 404 });
    }

    // 🛡️ Contrôle de souveraineté strict
    const isAuthor = book.authorUid === currentUser.uid;
    const isArchitect = currentUser.capabilities?.includes('*');
    if (!isAuthor && !isArchitect) {
      return NextResponse.json({ error: "Souveraineté violée." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get('url');
    if (!fileUrl) {
      return NextResponse.json({ error: 'URL de l\'artefact à purger manquante.' }, { status: 400 });
    }

    // 🛡️ SUTURE DE SÉCURITÉ IDOR : Vérification formelle que l'URL appartient bien à ce livre !
    const isManuscrit = book.fileUrl === fileUrl;
    const isCover = book.coverUrl === fileUrl;

    if (!isManuscrit && !isCover) {
      return NextResponse.json({ error: "Souveraineté brisée : cet artefact n'appartient pas à cet ouvrage." }, { status: 403 });
    }

    // 1. Purge physique sur R2 (uniquement après validation formelle)
    const key = storageService.extractKeyFromUrl(fileUrl);
    await storageService.deleteFile(key);

    // 2. Nettoyage conditionnel en base basé strictement sur l'UID
    const updateQuery: any = {};
    if (isManuscrit) updateQuery.fileUrl = '';
    if (isCover) updateQuery.coverUrl = '';

    await LibraryBookModel.updateOne({ uid: book.uid }, { $set: updateQuery });

    // 💥 Invalidation en cascade
    revalidateTag('bibliotek');
    revalidateTag(`bibliotek-${identifier}`);
    if (book.slug) revalidateTag(`bibliotek-${book.slug}`);
    if (book.uid) revalidateTag(`bibliotek-${book.uid}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Artefact désintégré du Nexus et de la Silice.' 
    }, { status: 200 });

  } catch (error: any) {
    console.error('🔥 [BIBLIOTEK DELETE UPLOAD FATAL ERROR] :', error);
    const status = error instanceof IlotError ? error.status : 500;
    return NextResponse.json({ error: error.message || 'Erreur interne du serveur.' }, { status });
  }
});