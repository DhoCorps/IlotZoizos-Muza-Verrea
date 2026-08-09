export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { SampleModel, PartitaModel, UniversalMediaRegistry } from '@ilot/infrastructure';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { ISample } from '@ilot/types';

// Schéma de validation strict pour le projet E-Jay entrant
const StudioExportSchema = z.object({
  title: z.string().min(2, "Le titre de l'œuvre est requis."),
  bpm: z.number().min(40).max(300),
  tracks: z.array(z.object({
    id: z.number(),
    sampleUid: z.string(),
    volume: z.number(),
    isMuted: z.boolean()
  })).min(1, "Le projet doit contenir au moins une piste active.")
});

export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const rawBody = await req.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json({ success: false, error: 'Corps de requête illisible.' }, { status: 400 });
    }

    const validation = StudioExportSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: 'Structure du projet invalide.', details: validation.error.flatten() }, { status: 400 });
    }

    const { title, bpm, tracks } = validation.data;
    const sampleUids = tracks.map(t => t.sampleUid);

    // 1. Auscultation de tous les samples utilisés dans la Silice
    const usedSamples: ISample[] = await SampleModel.find({ uid: { $in: sampleUids } }).lean();
    
    if (usedSamples.length === 0) {
      return NextResponse.json({ success: false, error: 'Aucun sample valide trouvé.' }, { status: 404 });
    }

    // 2. Calcul par intersection (AND) des permissions de diffusion
    // Si UN SEUL sample interdit une diffusion, l'œuvre finale l'interdit aussi.
    let finalAllowRadio = true;
    let finalAllowBlindTest = true;
    let finalAllowShowcase = true;

    usedSamples.forEach(sample => {
      if (!sample.permissions.allowRadio) finalAllowRadio = false;
      if (!sample.permissions.allowBlindTest) finalAllowBlindTest = false;
      if (!sample.permissions.allowShowcase) finalAllowShowcase = false;
    });

    // 3. Génération du Slug et de l'UID
    const projectUid = `samplotek_${uuidv4()}`;
    let baseSlug = slugify(title);
    let finalSlug = baseSlug;
    let counter = 1;
    
    try {
      while (await PartitaModel.findOne({ slug: finalSlug })?.lean?.()) {
        finalSlug = `${baseSlug}-${counter}`;
        counter++;
      }
    } catch {
      // Sécurité si le mock n'est pas chaînable en test
    }

    // 4. Sédimentation en tant que "Partition" dans Partita
    const newProject = await PartitaModel.create({
      uid: projectUid,
      slug: finalSlug,
      title,
      authorUid: currentUser.uid,
      status: 'PUBLISHED',
      type: 'SAMPLOTEK_PROJECT', // Type spécifique pour le lecteur E-Jay
      content: JSON.stringify({ bpm, tracks }), // La structure est sauvegardée
      instrument: 'SAMPLOTEK',
      metadata: {
        permissions: {
          allowRadio: finalAllowRadio,
          allowBlindTest: finalAllowBlindTest,
          allowShowcase: finalAllowShowcase
        },
        usedSampleUids: sampleUids
      }
    });

    // 5. Indexation dans le Registre Universel pour la diffusion (Si Showcase autorisé)
    if (finalAllowShowcase) {
      await UniversalMediaRegistry.indexItem({
        mediaId: projectUid,
        sourceApp: 'PARTITA', // S'intègre nativement à l'écosystème Partita
        ownerUid: currentUser.uid,
        ownerSlug: currentUser.slug || currentUser.uid,
        title: title,
        mediaUrl: '', // Pas de MP3 final, le lecteur lira la structure JSON
        thumbnailUrl: '', 
        consentForShowcase: true,
        consentForMusicSync: finalAllowRadio, // Sert de flag pour la radio
        createdAt: new Date(),
        metadata: {
          isStudioProject: true
        }
      });
    }

    // 💥 BOOM ! Invalidation chirurgicale du cache
    revalidateTag('partitas');
    revalidateTag(`partitas-user-${currentUser.uid}`);
    revalidateTag('universal-media');

    return NextResponse.json({
      success: true,
      message: 'Œuvre SamploTek mixée et sédimentée avec succès dans l\'Îlot ! 🎛️',
      data: {
        uid: projectUid,
        slug: finalSlug,
        permissions: {
          allowRadio: finalAllowRadio,
          allowBlindTest: finalAllowBlindTest,
          allowShowcase: finalAllowShowcase
        }
      }
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('🔥 [STUDIO EXPORT ERROR] :', error);
    const err = error as { status?: number; statusCode?: number; message?: string };
    const status = err.status || err.statusCode || 500;
    return NextResponse.json({ success: false, error: err.message || 'Erreur interne du mixage.' }, { status });
  }
});