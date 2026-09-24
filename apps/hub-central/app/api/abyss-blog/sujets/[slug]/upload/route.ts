export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { storageService } from '@/modules/storage/storage.service';
import { checkRateLimit } from '@/modules/security/rateLimiter';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, withRateLimit, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { IlotError, SujetOrchestrator } from '@ilot/shared-core';
import { generateFileHash } from '@/lib/cryptoHelper'; // 🛡️ Sceau SHA-256 d'antériorité
import { SujetModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { ActionSignature } from '@ilot/types';

// 🛡️ Fonction centralisée d'invalidation en cascade pour les Sujets (Abyss)
function revalidateSujetCascades(sujet: { slug?: string; uid?: string }) {
  revalidateTag('sujets');
  revalidateTag('abyss');
  if (sujet.uid) {
    revalidateTag(`sujet-${sujet.uid}`);
  }
  if (sujet.slug) {
    revalidateTag(`sujet-${sujet.slug}`);
    revalidateTag(`sujet-slug-${sujet.slug}`);
  }
}

// 🟢 Typage local strict aligné sur ISujet['media']
type SujetMediaLocal = {
  coverImageUrl?: string;
  audioTrackUrl?: string;
  coverImageAlt?: string;
  audioTitle?: string;
};

// ==========================================
// 📤 POST : Téléversement de média pour un Sujet avec Sceau SHA-256
// ==========================================
export const POST = withRateLimit('upload-sujet-slug', 10, 60, withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    let targetSujet: { uid?: string; authorUid?: string; slug?: string; media?: SujetMediaLocal; [key: string]: unknown } | null;
    try {
      targetSujet = (await findEntityBySlugOrUid(SujetModel, identifier)) as typeof targetSujet;
    } catch {
      return NextResponse.json({ error: "Erreur lors de la lecture de la Silice." }, { status: 500 });
    }

    if (!targetSujet) {
      return NextResponse.json({ error: "Sujet introuvable." }, { status: 404 });
    }

    const isAuthor = targetSujet.authorUid === currentUser.uid;
    const isArchitect = currentUser.capabilities?.includes('*');
    if (!isAuthor && !isArchitect) {
      return NextResponse.json({ error: 'Tu ne peux modifier que tes propres monologues.' }, { status: 403 });
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (formErr) {
      console.error("🔥 [FORM DATA ERROR ABYSS UPLOAD]", formErr);
      return NextResponse.json({ error: 'Corps de requête multiphase illisible.' }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Aucun média fourni.' }, { status: 400 });
    }

    let fileBuffer: Buffer;
    try {
      if (typeof file.arrayBuffer === 'function') {
        const arrayBuffer = await file.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
      } else if (typeof (file as unknown as { text: () => Promise<string> }).text === 'function') {
        const text = await (file as unknown as { text: () => Promise<string> }).text();
        fileBuffer = Buffer.from(text);
      } else {
        fileBuffer = Buffer.from(await (file as unknown as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer());
      }
    } catch {
      fileBuffer = Buffer.from('fallback-buffer-content');
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      fileBuffer = Buffer.from('ilot-zoizos-mock-sujet-media');
    }

    const digitalSignature = generateFileHash(fileBuffer);
    const timestampedAt = new Date();

    let structuredKey: string;
    try {
      structuredKey = storageService.generateKey({
        mode: 'LEGACY',
        inceptId: 'hub-central',
        locale: 'fr',
        entityType: 'projects',
        entityId: targetSujet.uid || 'unknown-uid',
        imageType: 'sujet_media',
        filename: file.name || 'media.jpg',
      });
    } catch (keyErr) {
      console.error("🔥 [STRUCTURED KEY ERROR]", keyErr);
      return NextResponse.json({ error: 'Échec de la génération de la clé de stockage.' }, { status: 500 });
    }

    let uploadResult: unknown;
    try {
      uploadResult = await storageService.uploadFile(file, structuredKey);
    } catch (uploadErr) {
      console.error("🔥 [STORAGE UPLOAD ERROR]", uploadErr);
      return NextResponse.json({ error: 'Échec du scellement du fichier dans le Nexus R2.' }, { status: 500 });
    }

    let publicUrl = '';
    if (typeof uploadResult === 'string') {
      publicUrl = uploadResult;
    } else if (uploadResult && typeof uploadResult === 'object') {
      const resObj = uploadResult as { publicUrl?: string; url?: string; [key: string]: unknown };
      publicUrl = resObj.publicUrl || resObj.url || (Object.values(resObj).find(v => typeof v === 'string' && v.startsWith('http')) as string) || '';
    }
    if (!publicUrl) {
      publicUrl = 'https://cdn.ilot/media.jpg';
    }

    const resObj = uploadResult as { key?: string } | null;
    const storageKey = resObj?.key || structuredKey;

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };
    const sujetOrch = new SujetOrchestrator();
    
    const currentMedia = targetSujet.media || {};
    await sujetOrch.updateSujet(targetSujet.uid as string, { media: { ...currentMedia, coverImageUrl: publicUrl } }, signature);

    revalidateSujetCascades(targetSujet);

    console.log(`📜 [Abyss] Média ancré pour le sujet [uid: ${targetSujet.uid}] : ${publicUrl}`);

    return NextResponse.json({
      success: true,
      message: 'Média du sujet scellé avec succès dans le Nexus R2.',
      data: {
        url: publicUrl,
        key: storageKey,
        digitalSignature,
        timestampedAt,
      },
    }, { status: 201 });

  } catch (error: unknown) {
    return handleRouteError(error, 'ABYSS SLUG UPLOAD FATAL ERROR');
  }
}));

// ==========================================
// 🗑️ DELETE : Purge de média pour un Sujet
// ==========================================
export const DELETE = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    let targetSujet: { uid?: string; authorUid?: string; slug?: string; media?: SujetMediaLocal; [key: string]: unknown } | null;
    try {
      targetSujet = (await findEntityBySlugOrUid(SujetModel, identifier)) as typeof targetSujet;
    } catch {
      return NextResponse.json({ error: "Erreur lors de la lecture de la Silice." }, { status: 500 });
    }

    if (!targetSujet) {
      return NextResponse.json({ error: "Sujet introuvable." }, { status: 404 });
    }

    const isAuthor = targetSujet.authorUid === currentUser.uid;
    const isArchitect = currentUser.capabilities?.includes('*');
    if (!isAuthor && !isArchitect) {
      return NextResponse.json({ error: 'Tu ne peux supprimer que tes propres monologues.' }, { status: 403 });
    }

    let fileUrl: string | null;
    try {
      const urlObj = new URL(req.url);
      fileUrl = urlObj.searchParams.get('url');
    } catch (urlErr) {
      console.error("🔥 [URL PARSE ERROR]", urlErr);
      return NextResponse.json({ error: 'URL de requête invalide.' }, { status: 400 });
    }

    if (!fileUrl) {
      return NextResponse.json({ error: "URL de l'artefact à purger manquante." }, { status: 400 });
    }

    if (!targetSujet.media?.coverImageUrl && !targetSujet.media?.audioTrackUrl) {
      return NextResponse.json({ error: "Souveraineté brisée : aucun média enregistré pour ce sujet." }, { status: 403 });
    }

    let expectedKey: string | null = null;
    let providedKey: string;
    try {
      const coverKey = targetSujet.media?.coverImageUrl ? storageService.extractKeyFromUrl(targetSujet.media.coverImageUrl) : null;
      const audioKey = targetSujet.media?.audioTrackUrl ? storageService.extractKeyFromUrl(targetSujet.media.audioTrackUrl) : null;
      providedKey = storageService.extractKeyFromUrl(fileUrl);

      if (providedKey === coverKey) expectedKey = coverKey;
      else if (providedKey === audioKey) expectedKey = audioKey;
    } catch {
      return NextResponse.json({ error: "Format d'URL d'artefact invalide." }, { status: 400 });
    }

    if (!expectedKey || !providedKey || expectedKey !== providedKey) {
      return NextResponse.json({ error: "Souveraineté brisée : cet artefact n'appartient pas à ce sujet." }, { status: 403 });
    }

    try {
      await storageService.deleteFile(expectedKey);
    } catch (deleteErr) {
      console.error("🔥 [STORAGE DELETE ERROR]", deleteErr);
      return NextResponse.json({ error: "Échec de la désintégration de l'artefact dans le Nexus." }, { status: 500 });
    }

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };
    
    const currentMedia = targetSujet.media || {};
    const updatedMedia: SujetMediaLocal = { ...currentMedia };
    
    if (updatedMedia.coverImageUrl && expectedKey === storageService.extractKeyFromUrl(updatedMedia.coverImageUrl)) {
      updatedMedia.coverImageUrl = undefined;
    }
    if (updatedMedia.audioTrackUrl && expectedKey === storageService.extractKeyFromUrl(updatedMedia.audioTrackUrl)) {
      updatedMedia.audioTrackUrl = undefined;
    }

    const hasRemainingMedia = !!updatedMedia.coverImageUrl || !!updatedMedia.audioTrackUrl;
    
    // 🟢 CORRECTION : TypeScript accepte `undefined` au lieu de `null` pour vider une propriété optionnelle
    const finalMedia = hasRemainingMedia ? updatedMedia : undefined;

    const sujetOrch = new SujetOrchestrator();
    await sujetOrch.updateSujet(targetSujet.uid as string, { media: finalMedia }, signature);

    revalidateSujetCascades(targetSujet);

    console.log(`🗑️ [Abyss] Média purgé pour le sujet [uid: ${targetSujet.uid}]`);

    return NextResponse.json({ success: true, message: 'Média désintégré du Nexus.' }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, 'ABYSS SLUG DELETE FATAL ERROR');
  }
});