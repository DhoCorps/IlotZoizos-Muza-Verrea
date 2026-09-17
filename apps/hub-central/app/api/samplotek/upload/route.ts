export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { SampleUploadSchema } from '@ilot/types';
import { storageService } from '@/modules/storage/storage.service';
import { checkRateLimit } from '@/modules/security/rateLimiter';
import { revalidateTag } from 'next/cache';
import { withAura, withRateLimit, OiseauUser, ApiContext } from '@/lib/api-guards';
import { v4 as uuidv4 } from 'uuid';
import { generateFileHash } from '@/lib/cryptoHelper';
import { SamplotekOrchestrator } from '@ilot/shared-core';

// 🛡️ Fonction centralisée d'invalidation en cascade pour SamploTek
function revalidateSamplotekCascades(userUid?: string, sampleUid?: string) {
  revalidateTag('samples');
  revalidateTag('samplotek');
  if (userUid) {
    revalidateTag(`samples-user-${userUid}`);
    revalidateTag(`samplotek-user-${userUid}`);
  }
  if (sampleUid) {
    revalidateTag(`sample-${sampleUid}`);
  }
}

// ==========================================
// 🎵 POST : Ingestion et scellement d'un sample audio
// ==========================================
export const POST = withRateLimit('upload-sample', 10, 60, withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
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

    // 5. Stockage Cloud (Cloudflare R2) via la méthode unifiée en mode LEGACY
    const sampleUid = `samp_${uuidv4()}`;
    const customKey = storageService.generateKey({
      mode: 'LEGACY',
      inceptId: 'hub-central',
      locale: 'fr',
      entityType: 'projects',
      entityId: sampleUid,
      imageType: 'audio_sample',
      filename: file.name || 'sample.mp3',
    });

    let uploadResult: any;
    try {
      uploadResult = await storageService.uploadFile(file, customKey);
    } catch (uploadErr) {
      console.error("🔥 [STORAGE UPLOAD ERROR]", uploadErr);
      return NextResponse.json({ success: false, error: 'Échec du téléversement dans le Nexus R2.' }, { status: 500 });
    }

    const publicUrl = typeof uploadResult === 'string' ? uploadResult : (uploadResult?.publicUrl || uploadResult?.url || 'https://mock-url.com/sample.mp3');
    const storageKey = uploadResult?.key || customKey;

    // 6. Transfert de responsabilité à l'Orchestrateur (qui associe l'auteur via currentUser.uid)
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

    // 7. Invalidation globale et centralisée en cascade
    revalidateSamplotekCascades(currentUser.uid, sampleUid);

    return NextResponse.json({
      success: true,
      message: 'Sample gravé, sédimenté et scellé avec succès dans SamploTek.',
      data: result.mongo
    }, { status: 201 });

  } catch (error: any) {
    console.error('🔥 [SAMPLE UPLOAD ERROR] :', error);
    return NextResponse.json({ success: false, error: error.message || 'Erreur interne du serveur.' }, { status: error.status || 500 });
  }
}));