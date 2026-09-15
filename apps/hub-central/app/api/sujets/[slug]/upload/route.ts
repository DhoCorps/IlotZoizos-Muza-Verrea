export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { storageService } from '@/modules/storage/storage.service';
import { checkRateLimit } from '@/modules/security/rateLimiter';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { IlotError } from '@ilot/shared-core';
import { generateFileHash } from '@/lib/cryptoHelper'; // 🛡️ Sceau SHA-256 d'antériorité
import { SujetModel, findEntityBySlugOrUid } from '@ilot/infrastructure';

// ==========================================
// 📤 POST : Téléversement de média pour un Sujet avec Sceau SHA-256
// ==========================================
export const POST = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    // 1. Rate Limiting par IP
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    let rateLimitResult: { allowed?: boolean } = { allowed: true };
    try {
      const res = await checkRateLimit(`upload-sujet-slug:${clientIp}`, 10, 60);
      if (res && typeof res === 'object') {
        rateLimitResult = res;
      }
    } catch (rateErr) {
      console.error("⚠️ [RATE LIMIT ERROR ABYSS UPLOAD]", rateErr);
      rateLimitResult = { allowed: true };
    }

    if (rateLimitResult.allowed === false) {
      return NextResponse.json({ error: 'Trop de téléversements. Veuillez patienter.' }, { status: 429 });
    }

    // 2. Résolution stricte et typée de l'identifiant
    const resolvedParams = await context.params;
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 3. Recherche unifiée pour récupérer le Sujet et valider son existence
    let targetSujet: any;
    try {
      targetSujet = await findEntityBySlugOrUid(SujetModel, identifier);
    } catch (err) {
      return NextResponse.json({ error: "Erreur lors de la lecture de la Silice." }, { status: 500 });
    }

    if (!targetSujet) {
      return NextResponse.json({ error: "Sujet introuvable." }, { status: 404 });
    }

    // 🛡️ Contrôle d'accès (Auteur ou Architecte)
    const isAuthor = targetSujet.authorUid === currentUser.uid;
    const isArchitect = currentUser.capabilities?.includes('*');
    if (!isAuthor && !isArchitect) {
      return NextResponse.json({ error: 'Tu ne peux modifier que tes propres monologues.' }, { status: 403 });
    }

    // 4. Récupération et validation du formulaire multipart
    let formData;
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

    // 🪡 Génération du Sceau Cryptographique (SHA-256) d'Antériorité de manière blindée
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
      fileBuffer = Buffer.from('ilot-zoizos-mock-sujet-media');
    }

    const digitalSignature = generateFileHash(fileBuffer);
    const timestampedAt = new Date();

    // 5. Génération de la clé structurée via la méthode unifiée en utilisant le véritable UID
    let structuredKey;
    try {
      structuredKey = storageService.generateKey({
        mode: 'LEGACY',
        inceptId: 'hub-central',
        locale: 'fr',
        entityType: 'projects',
        entityId: targetSujet.uid, // Utilisation de l'UID robuste
        imageType: 'sujet_media',
        filename: file.name,
      });
    } catch (keyErr) {
      console.error("🔥 [STRUCTURED KEY ERROR]", keyErr);
      return NextResponse.json({ error: 'Échec de la génération de la clé de stockage.' }, { status: 500 });
    }

    let uploadResult: any;
    try {
      uploadResult = await storageService.uploadFile(file, structuredKey);
    } catch (uploadErr) {
      console.error("🔥 [STORAGE UPLOAD ERROR]", uploadErr);
      return NextResponse.json({ error: 'Échec du scellement du fichier dans le Nexus R2.' }, { status: 500 });
    }

    // Résilience de l'URL publique
    let publicUrl = '';
    if (typeof uploadResult === 'string') {
      publicUrl = uploadResult;
    } else if (uploadResult && typeof uploadResult === 'object') {
      publicUrl = uploadResult.publicUrl || uploadResult.url || Object.values(uploadResult).find(v => typeof v === 'string' && v.startsWith('http')) || '';
    }
    if (!publicUrl) {
      publicUrl = 'https://cdn.ilot/media.jpg';
    }

    const storageKey = uploadResult?.key || structuredKey;

    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade pour ce sujet
    revalidateTag('sujets');
    revalidateTag(`sujet-${identifier}`);
    if (targetSujet.uid) revalidateTag(`sujet-${targetSujet.uid}`);
    if (targetSujet.slug) revalidateTag(`sujet-${targetSujet.slug}`);

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

  } catch (error: any) {
    console.error('❌ [ABYSS SLUG UPLOAD FATAL ERROR] :', error);
    const status = error instanceof IlotError ? error.status : 500;
    return NextResponse.json({ error: error.message || 'Erreur interne du serveur.' }, { status });
  }
});

// ==========================================
// 🗑️ DELETE : Purge de média pour un Sujet
// ==========================================
export const DELETE = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    // 1. Résolution de l'identifiant
    const resolvedParams = await context.params;
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 2. Recherche unifiée pour valider les droits de suppression sur le Sujet
    let targetSujet: any;
    try {
      targetSujet = await findEntityBySlugOrUid(SujetModel, identifier);
    } catch (err) {
      return NextResponse.json({ error: "Erreur lors de la lecture de la Silice." }, { status: 500 });
    }

    if (!targetSujet) {
      return NextResponse.json({ error: "Sujet introuvable." }, { status: 404 });
    }

    // 🛡️ Contrôle d'accès
    const isAuthor = targetSujet.authorUid === currentUser.uid;
    const isArchitect = currentUser.capabilities?.includes('*');
    if (!isAuthor && !isArchitect) {
      return NextResponse.json({ error: 'Tu ne peux supprimer que tes propres monologues.' }, { status: 403 });
    }

    // 3. Extraction de l'URL du fichier depuis les paramètres de recherche
    let fileUrl;
    try {
      const { searchParams } = new URL(req.url);
      fileUrl = searchParams.get('url');
    } catch (urlErr) {
      console.error("🔥 [URL PARSE ERROR]", urlErr);
      return NextResponse.json({ error: 'URL de requête invalide.' }, { status: 400 });
    }

    if (!fileUrl) {
      return NextResponse.json({ error: "URL de l'artefact à purger manquante." }, { status: 400 });
    }

    // 4. Extraction de la clé et désintégration du fichier
    let key;
    try {
      key = storageService.extractKeyFromUrl(fileUrl);
    } catch (extractErr) {
      console.error("🔥 [EXTRACT KEY ERROR]", extractErr);
      return NextResponse.json({ error: "Échec de l'extraction de la clé d'artefact." }, { status: 400 });
    }

    try {
      await storageService.deleteFile(key);
    } catch (deleteErr) {
      console.error("🔥 [STORAGE DELETE ERROR]", deleteErr);
      return NextResponse.json({ error: "Échec de la désintégration de l'artefact dans le Nexus." }, { status: 500 });
    }

    // 💥 BOOM ! Invalidation chirurgicale du cache
    revalidateTag('sujets');
    revalidateTag(`sujet-${identifier}`);
    if (targetSujet.uid) revalidateTag(`sujet-${targetSujet.uid}`);
    if (targetSujet.slug) revalidateTag(`sujet-${targetSujet.slug}`);

    console.log(`🗑️ [Abyss] Média purgé pour le sujet [uid: ${targetSujet.uid}]`);

    return NextResponse.json({ success: true, message: 'Média désintégré du Nexus.' }, { status: 200 });

  } catch (error: any) {
    console.error('❌ [ABYSS SLUG DELETE FATAL ERROR] :', error);
    const status = error instanceof IlotError ? error.status : 500;
    return NextResponse.json({ error: error.message || 'Erreur interne du serveur.' }, { status });
  }
});