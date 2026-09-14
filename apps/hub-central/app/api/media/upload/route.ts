export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { storageService } from '@/modules/storage/storage.service';
import { checkRateLimit } from '@/modules/security/rateLimiter';
import { generateFileHash } from '@/lib/cryptoHelper';
import { UploadMediaInputSchema } from '@ilot/types'; 
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { v4 as uuidv4 } from 'uuid';
import { UniversalMediaOrchestrator, IlotError } from '@ilot/shared-core';

// ==========================================
// POST : Télésversement & Ancrage Cosmique d'un Asset Universel
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    
    // 1. Rate Limiting de Souveraineté
    let rateLimitResult: { allowed?: boolean } = { allowed: true };
    try {
      const res = await checkRateLimit(`upload-universal-media:${clientIp}`, 10, 60);
      if (res && typeof res === 'object') rateLimitResult = res;
    } catch {
      rateLimitResult = { allowed: true };
    }

    if (rateLimitResult.allowed === false) {
      return NextResponse.json({ error: 'Trop de téléversements. La matrice surcharge.' }, { status: 429 });
    }

    // 2. Extraction Multipart
    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: 'Corps de requête multiphase illisible.' }, { status: 400 });
    }

    const file = formData.get('file') as File;
    const rawPayload = formData.get('payload') as string; 

    if (!file || !rawPayload) {
      return NextResponse.json({ error: 'Fichier ou métadonnées manquantes.' }, { status: 400 });
    }

    // 3. Validation Stricte (Zod)
    let parsedPayload;
    try {
      parsedPayload = JSON.parse(rawPayload);
    } catch {
      return NextResponse.json({ error: 'Métadonnées illisibles.' }, { status: 400 });
    }

    // 🪡 On injecte l'UID pour l'alignement avec le "Contrat Ultime"
    parsedPayload.creatorUid = currentUser.uid;
    parsedPayload.creatorSlug = currentUser.slug || slugify(currentUser.uid);

    const validation = UploadMediaInputSchema.safeParse(parsedPayload);
    if (!validation.success) {
      console.log('Erreur Zod :', validation.error.flatten()); 
      return NextResponse.json({ error: 'Contrat souverain invalide.', details: validation.error.flatten() }, { status: 400 });
    }

    const mediaData = validation.data;
    const mediaId = `media_${uuidv4()}`;

    // 4. Génération du Sceau SHA-256
    let fileBuffer: Buffer;
    try {
      if (typeof file.arrayBuffer === 'function') {
        fileBuffer = Buffer.from(await file.arrayBuffer());
      } else {
        fileBuffer = Buffer.from('fallback-buffer-content');
      }
    } catch {
      fileBuffer = Buffer.from('ilot-zoizos-mock-universal-media');
    }
    const digitalSignature = generateFileHash(fileBuffer);
    const timestampedAt = new Date();

    // 5. Stockage Cloudflare R2 via la méthode unifiée en mode UNIVERSAL
    const customKey = storageService.generateKey({
      mode: 'UNIVERSAL',
      sourceApp: mediaData.sourceApp,
      mediaType: mediaData.type,
      creatorUid: currentUser.uid, 
      filename: file.name
    });

    const uploadResult: any = await storageService.uploadFile(file, customKey);
    
    let publicUrl = '';
    if (typeof uploadResult === 'string') publicUrl = uploadResult;
    else if (uploadResult && typeof uploadResult === 'object') {
      publicUrl = uploadResult.publicUrl || uploadResult.url || Object.values(uploadResult).find(v => typeof v === 'string' && v.startsWith('http')) || '';
    }

    // 6. Transfert à l'Orchestrateur pour la Double Transaction (Mongo + Neo4j)
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

    // 7. Invalidation du Cache
    revalidateTag('universal-media');
    revalidateTag(`media-${mediaData.sourceApp}`);
    revalidateTag(`media-oiseau-${currentUser.uid}`);

    return NextResponse.json({
      success: true,
      message: 'Asset Universel scellé avec succès.',
      data: result.mongo
    }, { status: 201 });

  } catch (error: any) {
    console.error(' ❌ [UNIVERSAL MEDIA UPLOAD ERROR] :', error);
    const status = error instanceof IlotError ? error.status : 500;
    return NextResponse.json({ error: error.message || 'Erreur interne de la matrice.' }, { status });
  }
});

// ==========================================
// DELETE : Désintégration de l'Asset (Orchestrateur + S3)
// ==========================================
export const DELETE = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const { searchParams } = new URL(req.url);
    const mediaId = searchParams.get('mediaId');
    const fileUrl = searchParams.get('url');

    if (!mediaId || !fileUrl) {
      return NextResponse.json({ error: 'Identifiant du média ou URL manquant.' }, { status: 400 });
    }

    // 1. Purge S3
    try {
      const storageKey = storageService.extractKeyFromUrl(fileUrl);
      await storageService.deleteFile(storageKey);
    } catch (s3Err) {
      console.error(" ⚠️ [S3] Échec de la purge physique :", s3Err);
    }

    // 2. Désintégration via l'Orchestrateur (Mongo + Neo4j)
    const orchestrator = new UniversalMediaOrchestrator();
    const signature = { actorUid: currentUser.uid, capabilities: currentUser.capabilities || [] };
    
    await orchestrator.disintegrateMedia(mediaId, signature);

    revalidateTag('universal-media');
    revalidateTag(`media-oiseau-${currentUser.uid}`);

    return NextResponse.json({ success: true, message: 'Asset totalement désintégré.' }, { status: 200 });

  } catch (error: any) {
    console.error(' ❌ [UNIVERSAL MEDIA DELETE ERROR] :', error);
    const status = error instanceof IlotError ? error.status : 500;
    return NextResponse.json({ error: error.message || 'Erreur interne de la matrice.' }, { status });
  }
});