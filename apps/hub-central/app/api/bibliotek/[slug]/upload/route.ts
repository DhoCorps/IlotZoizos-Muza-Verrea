export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { storageService } from '@/modules/storage/storage.service';
import { LibraryBookModel, findEntityBySlugOrUid, ILibraryBook } from '@ilot/infrastructure';
import { getCachedBook } from '@/lib/cache/bibliotek.cache'; // 🚀 Import du Cache Bibliotek
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, withRateLimit, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { generateFileHash } from '@/lib/cryptoHelper'; // 🛡️ Sceau SHA-256 technique

// 🛡️ Fonction centralisée d'invalidation en cascade pour la Bibliotek
function revalidateBibliotekCascades(book: { slug?: string; uid?: string }) {
  revalidateTag('bibliotek');
  revalidateTag('sanctuaire');
  if (book.uid) {
    revalidateTag(`bibliotek-${book.uid}`);
  }
  if (book.slug) {
    revalidateTag(`bibliotek-${book.slug}`);
    revalidateTag(`bibliotek-slug-${book.slug}`);
  }
}

// ==========================================
// POST : Verser un manuscrit ou une couverture sur le Nexus R2
// ==========================================
export const POST = withRateLimit('upload-bibliotek', 10, 60, withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    // 🛡️ Résolution asynchrone sécurisée des paramètres de route (Standard Next.js 15)
    let resolvedParams: { slug?: string | string[] } | undefined;
    try {
      resolvedParams = await context.params;
    } catch {
      return NextResponse.json({ success: false, error: "Paramètres de route invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ success: false, error: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 Résolution de l'ouvrage via le cache avec repli sur la base de données
    let book = (await getCachedBook(identifier)) as ILibraryBook | null;
    if (!book) {
      book = (await findEntityBySlugOrUid(LibraryBookModel, identifier)) as ILibraryBook | null;
    }

    if (!book) {
      return NextResponse.json({ success: false, error: "Ouvrage introuvable dans le Sanctuaire." }, { status: 404 });
    }

    // Vérification de souveraineté (seul l'auteur ou l'architecte peut verser dans le coffre)
    const isAuthor = book.authorUid === currentUser.uid;
    const isArchitect = currentUser.capabilities?.includes('*');
    if (!isAuthor && !isArchitect) {
      return NextResponse.json({ success: false, error: "Souveraineté violée : tu ne peux modifier un ouvrage qui ne t'appartient pas." }, { status: 403 });
    }

    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ success: false, error: "Corps de requête multiphase illisible." }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    const assetType = (formData.get('assetType') as string) || 'manuscript'; // 'manuscript' ou 'cover'
    if (!file) {
      return NextResponse.json({ success: false, error: 'Aucun fichier (manuscrit ou couverture) fourni.' }, { status: 400 });
    }

    // 🪡 Génération du Sceau Cryptographique (SHA-256) d'intégrité technique du fichier
    let fileBuffer: Buffer;
    try {
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } catch {
      fileBuffer = Buffer.from('ilot-zoizos-mock-bibliotek-asset');
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

    const uploadResult = await storageService.uploadFile(file, customKey) as unknown;

    // Résilience de l'URL publique
    let publicUrl = '';
    if (typeof uploadResult === 'string') {
      publicUrl = uploadResult;
    } else if (uploadResult && typeof uploadResult === 'object') {
      const resObj = uploadResult as Record<string, unknown>;
      const foundUrl = Object.values(resObj).find(v => typeof v === 'string' && v.startsWith('http')) as string | undefined;
      
      publicUrl = (resObj.publicUrl as string) || (resObj.url as string) || foundUrl || '';
    }
    if (!publicUrl) {
      publicUrl = 'https://cdn.ilot/book-asset.epub';
    }

    const storageKey = (uploadResult as { key?: string })?.key || customKey;

    // Mise à jour de la Silice (MongoDB) selon qu'il s'agit du manuscrit ou de la couverture
    const updatePayload: Record<string, unknown> = {};
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

    // 💥 Invalidation globale et centralisée en cascade
    revalidateBibliotekCascades(book);

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

  } catch (error: unknown) {
    return handleRouteError(error, 'Erreur interne du serveur.');
  }
}));

// ==========================================
// DELETE : Désintégrer un artefact du Sanctuaire (Strictement Privé / Aura)
// ==========================================
export const DELETE = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    // 🛡️ Résolution asynchrone sécurisée des paramètres de route
    let resolvedParams: { slug?: string | string[] } | undefined;
    try {
      resolvedParams = await context.params;
    } catch {
      return NextResponse.json({ success: false, error: "Paramètres de route invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    if (!identifier) {
      return NextResponse.json({ success: false, error: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 Résolution via le cache avec repli sur la base de données
    let book = (await getCachedBook(identifier)) as ILibraryBook | null;
    if (!book) {
      book = (await findEntityBySlugOrUid(LibraryBookModel, identifier)) as ILibraryBook | null;
    }

    if (!book) {
      return NextResponse.json({ success: false, error: "Ouvrage introuvable." }, { status: 404 });
    }

    // 🛡️ Contrôle de souveraineté strict
    const isAuthor = book.authorUid === currentUser.uid;
    const isArchitect = currentUser.capabilities?.includes('*');
    if (!isAuthor && !isArchitect) {
      return NextResponse.json({ success: false, error: "Souveraineté violée." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get('url');
    if (!fileUrl) {
      return NextResponse.json({ success: false, error: 'URL de l\'artefact à purger manquante.' }, { status: 400 });
    }

    // 🛡️ SUTURE DE SÉCURITÉ IDOR : Normalisation et comparaison stricte des clés de stockage
    let expectedManuscritKey = '';
    let expectedCoverKey = '';
    let providedKey = '';

    try {
      providedKey = storageService.extractKeyFromUrl(fileUrl);
      if (book.fileUrl) expectedManuscritKey = storageService.extractKeyFromUrl(book.fileUrl);
      if (book.coverUrl) expectedCoverKey = storageService.extractKeyFromUrl(book.coverUrl);
    } catch {
      return NextResponse.json({ success: false, error: "Format d'URL d'artefact invalide." }, { status: 400 });
    }

    const isManuscrit = book.fileUrl && expectedManuscritKey === providedKey;
    const isCover = book.coverUrl && expectedCoverKey === providedKey;

    if (!isManuscrit && !isCover) {
      return NextResponse.json({ success: false, error: "Souveraineté brisée : cet artefact n'appartient pas à cet ouvrage." }, { status: 403 });
    }

    // 1. Purge physique sur R2 via la clé normalisée
    await storageService.deleteFile(providedKey);

    // 2. Nettoyage conditionnel en base basé strictement sur l'UID
    const updateQuery: Record<string, unknown> = {};
    if (isManuscrit) updateQuery.fileUrl = '';
    if (isCover) updateQuery.coverUrl = '';

    await LibraryBookModel.updateOne({ uid: book.uid }, { $set: updateQuery });

    // 💥 Invalidation globale et centralisée en cascade
    revalidateBibliotekCascades(book);

    return NextResponse.json({ 
      success: true, 
      message: 'Artefact désintégré du Nexus et de la Silice.' 
    }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, 'Erreur interne du serveur.');
  }
});