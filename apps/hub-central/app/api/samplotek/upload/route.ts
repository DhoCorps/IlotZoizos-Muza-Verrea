export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { SampleModel } from '@ilot/infrastructure';
import { SampleUploadSchema } from '@ilot/types';
import { storageService } from '@/modules/storage/storage.service';
import { checkRateLimit } from '@/modules/security/rateLimiter';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { v4 as uuidv4 } from 'uuid';

export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    // 1. Rate Limiting par IP
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    let rateLimitResult;
    try {
      rateLimitResult = await checkRateLimit(`upload-sample:${clientIp}`, 10, 60);
    } catch {
      rateLimitResult = { allowed: true };
    }

    if (!rateLimitResult.allowed) {
      return NextResponse.json({ success: false, error: 'Trop de téléversements. Veuillez patienter.' }, { status: 429 });
    }

    // 2. Extraction sécurisée du FormData
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (err) {
      return NextResponse.json({ success: false, error: 'Corps de requête multiphase illisible.' }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    if (!file || typeof file === 'string') {
      return NextResponse.json({ success: false, error: 'Aucun fichier audio fourni.' }, { status: 400 });
    }

    // 3. Extraction et secours sur les métadonnées
    const rawTitle = formData.get('title');
    const rawTempo = formData.get('tempoBpm');
    const rawKey = formData.get('musicalKey');
    const rawStyle = formData.get('style');

    const rawData = {
      title: rawTitle ? String(rawTitle) : 'Sample Sans Nom',
      tempoBpm: rawTempo ? Number(rawTempo) : 120,
      musicalKey: rawKey ? String(rawKey) : 'C major',
      style: rawStyle ? String(rawStyle) : 'Ambient',
      allowRadio: formData.get('allowRadio') !== 'false',
      allowBlindTest: formData.get('allowBlindTest') !== 'false',
      allowShowcase: formData.get('allowShowcase') !== 'false',
    };

    const validation = SampleUploadSchema.safeParse(rawData);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: 'Métadonnées invalides.', details: validation.error.flatten() }, { status: 400 });
    }

    const data = validation.data;

    // 4. Stockage Cloud (Cloudflare R2)
    const sampleUid = `samp_${uuidv4()}`;
    const customKey = storageService.generateStructuredKey({
      inceptId: 'hub-central',
      locale: 'fr',
      entityType: 'projects',
      entityId: sampleUid,
      imageType: 'audio_sample',
      filename: file.name || 'sample.mp3',
    });

    const uploadResult = await storageService.uploadFile(file, customKey);

    // 5. Génération unique du Slug
    let baseSlug = slugify(data.title);
    let finalSlug = baseSlug;
    let counter = 1;
    try {
      while (await SampleModel.findOne({ slug: finalSlug })?.lean?.()) {
        finalSlug = `${baseSlug}-${counter}`;
        counter++;
      }
    } catch {
      // Sécurité si le mock/BDD n'est pas instancié
    }

    // 6. Sédimentation dans MongoDB
    const newSample = await SampleModel.create({
      uid: sampleUid,
      title: data.title,
      slug: finalSlug,
      audioUrl: uploadResult.publicUrl,
      storageKey: uploadResult.key,
      tempoBpm: data.tempoBpm,
      musicalKey: data.musicalKey,
      style: data.style,
      creatorUid: currentUser.uid,
      creatorSlug: currentUser.slug || currentUser.uid,
      permissions: {
        allowRadio: data.allowRadio,
        allowBlindTest: data.allowBlindTest,
        allowShowcase: data.allowShowcase,
      }
    });

    // 💥 BOOM ! Invalidation chirurgicale du cache
    revalidateTag('samples');
    revalidateTag(`samples-user-${currentUser.uid}`);

    return NextResponse.json({
      success: true,
      message: 'Sample gravé et sédimenté avec succès dans SamploTek.',
      data: newSample
    }, { status: 201 });

  } catch (error: any) {
    console.error('🔥 [SAMPLE UPLOAD ERROR] :', error);
    const status = error.status || error.statusCode || 500;
    return NextResponse.json({ success: false, error: error.message || 'Erreur interne du serveur.' }, { status });
  }
});