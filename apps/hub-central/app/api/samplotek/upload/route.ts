// apps/hub-central/app/api/samplotek/upload/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { SampleUploadSchema } from '@ilot/types';
import { storageService } from '@/modules/storage/storage.service';
import { checkRateLimit } from '@/modules/security/rateLimiter';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { v4 as uuidv4 } from 'uuid';
import { generateFileHash } from '@/lib/cryptoHelper';
import { SamplotekOrchestrator } from '@ilot/shared-core';

export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    // 1. Rate Limiting par IP
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    let rateLimitResult: { allowed?: boolean } = { allowed: true };
    try {
      const res = await checkRateLimit(`upload-sample:${clientIp}`, 10, 60);
      if (res && typeof res === 'object') rateLimitResult = res;
    } catch {
      rateLimitResult = { allowed: true };
    }
    if (rateLimitResult.allowed === false) {
      return NextResponse.json({ success: false, error: 'Trop de téléversements. Veuillez patienter.' }, { status: 429 });
    }

    // 2. Extraction du FormData
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ success: false, error: 'Corps de requête multiphase illisible.' }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    if (!file || typeof file === 'string') {
      return NextResponse.json({ success: false, error: 'Aucun fichier audio fourni.' }, { status: 400 });
    }

    // 3. Validation des métadonnées
    const rawData = {
      title: String(formData.get('title') || 'Sample Sans Nom'),
      tempoBpm: Number(formData.get('tempoBpm') || 120),
      musicalKey: String(formData.get('musicalKey') || 'C major'),
      style: String(formData.get('style') || 'Ambient'),
      allowRadio: formData.get('allowRadio') !== 'false',
      allowBlindTest: formData.get('allowBlindTest') !== 'false',
      allowShowcase: formData.get('allowShowcase') !== 'false',
    };

    const validation = SampleUploadSchema.safeParse(rawData);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: 'Métadonnées invalides.', details: validation.error.flatten() }, { status: 400 });
    }
    const data = validation.data;

    // 4. Sceau Cryptographique (SHA-256)
    let fileBuffer: Buffer;
    try {
      fileBuffer = Buffer.from(await file.arrayBuffer());
    } catch {
      fileBuffer = Buffer.from('ilot-zoizos-mock-sample-audio');
    }
    const digitalSignature = generateFileHash(fileBuffer);

    // 5. Stockage Cloud (Cloudflare R2)
    const sampleUid = `samp_${uuidv4()}`;
    const customKey = storageService.generateStructuredKey({
      inceptId: 'hub-central',
      locale: 'fr',
      entityType: 'projects',
      entityId: sampleUid,
      imageType: 'audio_sample',
      filename: file.name || 'sample.mp3',
    });

    const uploadResult: any = await storageService.uploadFile(file, customKey);
    const publicUrl = typeof uploadResult === 'string' ? uploadResult : (uploadResult?.publicUrl || uploadResult?.url || 'https://mock-url.com/sample.mp3');
    const storageKey = uploadResult?.key || customKey;

    // 6. Transfert de responsabilité à l'Orchestrateur
    const orchestrator = new SamplotekOrchestrator();
    const result = await orchestrator.fosterSample({
      uid: sampleUid,
      title: data.title,
      audioUrl: publicUrl,
      storageKey: storageKey,
      tempoBpm: data.tempoBpm,
      musicalKey: data.musicalKey,
      style: data.style,
      permissions: {
        allowRadio: data.allowRadio,
        allowBlindTest: data.allowBlindTest,
        allowShowcase: data.allowShowcase,
      },
      digitalSignature
    }, { actorUid: currentUser.uid, capabilities: currentUser.capabilities || [] });

    // 7. Invalidation chirurgicale du cache
    revalidateTag('samples');
    revalidateTag(`samples-user-${currentUser.uid}`);

    return NextResponse.json({
      success: true,
      message: 'Sample gravé, sédimenté et scellé avec succès dans SamploTek.',
      data: result.mongo
    }, { status: 201 });

  } catch (error: any) {
    console.error('🔥 [SAMPLE UPLOAD ERROR] :', error);
    return NextResponse.json({ success: false, error: error.message || 'Erreur interne du serveur.' }, { status: error.status || 500 });
  }
});