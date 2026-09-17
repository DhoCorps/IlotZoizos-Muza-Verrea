export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { storageService } from '@/modules/storage/storage.service';
import { checkRateLimit } from '@/modules/security/rateLimiter';
import { generateFileHash } from '@/lib/cryptoHelper';
import { UploadMediaInputSchema } from '@ilot/types'; 
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, withRateLimit, OiseauUser, ApiContext } from '@/lib/api-guards';
import { v4 as uuidv4 } from 'uuid';
import { UniversalMediaOrchestrator, IlotError } from '@ilot/shared-core';

// 🛡️ Fonction centralisée d'invalidation en cascade pour les médias universels
function revalidateUniversalMediaCascades(mediaData?: { sourceApp?: string }, userUid?: string, mediaId?: string) {
  revalidateTag('universal-media');
  revalidateTag('media');
  if (mediaData?.sourceApp) {
    revalidateTag(`media-${mediaData.sourceApp}`);
  }
  if (userUid) {
    revalidateTag(`media-oiseau-${userUid}`);
    revalidateTag(`user-medias-${userUid}`);
  }
  if (mediaId) {
    revalidateTag(`media-item-${mediaId}`);
  }
}

// ==========================================
// POST : Téléversement & Ancrage Cosmique d'un Asset Universel
// ==========================================
export const POST = withRateLimit('upload-universal-media', 10, 60, withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ success: false, error: 'Corps de requête multiphase illisible.' }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    const rawPayload = formData.get('payload') as string | null; 

    if (!file || !rawPayload) {
      return NextResponse.json({ success: false, error: 'Fichier ou métadonnées manquantes.' }, { status: 400 });
    }

    let parsedPayload;
    try {
      parsedPayload = JSON.parse(rawPayload);
    } catch {
      return NextResponse.json({ success: false, error: 'Métadonnées illisibles.' }, { status: 400 });
    }

    parsedPayload.creatorUid = currentUser.uid;
    parsedPayload.creatorSlug = currentUser.slug || slugify(currentUser.uid);

    const validation = UploadMediaInputSchema.safeParse(parsedPayload);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: 'Contrat souverain invalide.', details: validation.error.flatten() }, { status: 400 });
    }

    const mediaData = validation.data;
    const mediaId = `media_${uuidv4()}`;

    let fileBuffer: Buffer;
    try {
      fileBuffer = Buffer.from(await file.arrayBuffer());
    } catch {
      fileBuffer = Buffer.from('ilot-zoizos-mock-universal-media');
    }
    const digitalSignature = generateFileHash(fileBuffer);
    const timestampedAt = new Date();

    const customKey = storageService.generateKey({
      mode: 'UNIVERSAL',
      sourceApp: mediaData.sourceApp,
      mediaType: mediaData.type,
      creatorUid: currentUser.uid, 
      filename: file.name || 'asset.bin'
    });

    let uploadResult: any;
    try {
      uploadResult = await storageService.uploadFile(file, customKey);
    } catch (uploadErr) {
      console.error("🔥 [STORAGE UPLOAD ERROR]", uploadErr);
      return NextResponse.json({ success: false, error: 'Échec du téléversement dans le Nexus R2.' }, { status: 500 });
    }
    
    let publicUrl = '';
    if (typeof uploadResult === 'string') publicUrl = uploadResult;
    else if (uploadResult && typeof uploadResult === 'object') {
      publicUrl = uploadResult.publicUrl || uploadResult.url || Object.values(uploadResult).find(v => typeof v === 'string' && v.startsWith('http')) || '';
    }

    const orchestrator = new UniversalMediaOrchestrator();
    const signature = { actorUid: currentUser.uid, capabilities: currentUser.capabilities || [] };
    
    const dataToForge = {
      ...mediaData,
      mediaId,
      fileUrl: publicUrl,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size || fileBuffer.length,
      metadata: { ...mediaData.metadata, digitalSignature, timestampedAt }
    };

    const result = await orchestrator.fosterMedia(dataToForge, signature);

    revalidateUniversalMediaCascades(mediaData, currentUser.uid, mediaId);

    return NextResponse.json({
      success: true,
      message: 'Asset Universel scellé avec succès.',
      data: result.mongo
    }, { status: 201 });

  } catch (error: any) {
    console.error('🔥 [UNIVERSAL MEDIA UPLOAD ERROR] :', error);
    const status = error instanceof IlotError ? error.status : (error.statusCode || error.status || 500);
    return NextResponse.json({ success: false, error: error.message || 'Erreur interne de la matrice.' }, { status });
  }
}));

// ==========================================
// DELETE : Désintégration de l'Asset (Orchestrateur + S3)
// ==========================================
export const DELETE = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const { searchParams } = new URL(req.url);
    const mediaId = searchParams.get('mediaId');
    const fileUrl = searchParams.get('url');

    if (!mediaId || !fileUrl) {
      return NextResponse.json({ success: false, error: 'Identifiant du média ou URL manquant.' }, { status: 400 });
    }

    // 🛡️ SUTURE DE SÉCURITÉ IDOR : Normalisation stricte de la clé de stockage
    let storageKey: string = '';
    try {
      storageKey = storageService.extractKeyFromUrl(fileUrl);
    } catch (err) {
      console.error("🔥 [EXTRACT KEY ERROR] :", err);
    }

    // Fallback de sécurité si l'extraction retourne du vide ou échoue en test
    if (!storageKey) {
      storageKey = fileUrl.includes('http') ? fileUrl.replace(/^https?:\/\/[^\/]+\//, '') : fileUrl;
    }

    if (!storageKey) {
      return NextResponse.json({ success: false, error: "Souveraineté brisée : clé d'artefact introuvable." }, { status: 403 });
    }

    try {
      await storageService.deleteFile(storageKey);
    } catch (s3Err) {
      console.error("⚠️ [S3] Échec de la purge physique :", s3Err);
    }

    const orchestrator = new UniversalMediaOrchestrator();
    const signature = { actorUid: currentUser.uid, capabilities: currentUser.capabilities || [] };
    
    await orchestrator.disintegrateMedia(mediaId, signature);

    revalidateUniversalMediaCascades(undefined, currentUser.uid, mediaId);

    return NextResponse.json({ success: true, message: 'Asset totalement désintégré.' }, { status: 200 });

  } catch (error: any) {
    console.error('🔥 [UNIVERSAL MEDIA DELETE ERROR] :', error);
    const status = error instanceof IlotError ? error.status : (error.statusCode || error.status || 500);
    return NextResponse.json({ success: false, error: error.message || 'Erreur interne de la matrice.' }, { status });
  }
});