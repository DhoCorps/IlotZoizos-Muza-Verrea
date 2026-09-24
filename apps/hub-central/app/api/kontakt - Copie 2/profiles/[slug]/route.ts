export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { KontaktProfileModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

// 🛡️ Schéma Zod strict pour interdire l'assignation de masse sur les profils Kontakt
const UpdateKontaktProfileSchema = z.object({
  professionalTitle: z.string().min(1, "Le titre professionnel est requis.").optional(),
  bio: z.string().max(1000).optional(),
  alignment: z.string().optional(),
  skills: z.array(z.string()).optional(),
  status: z.string().optional(),
  portfolioUrl: z.string().url().nullable().optional(),
});

type UpdateKontaktProfileInput = z.infer<typeof UpdateKontaktProfileSchema>;

interface KontaktProfileDocument {
  uid: string;
  slug: string;
  userUid: string;
  professionalTitle?: string;
  bio?: string;
  alignment?: string;
  skills?: string[];
  status?: string;
  portfolioUrl?: string | null;
  [key: string]: unknown;
}

// ==========================================
// GET : Ausculter un profil Kontakt spécifique (Public / Silice)
// ==========================================
export const GET = withSilice(async (_req: NextRequest, context: ApiContext) => {
  try {
    let resolvedParams;
    try {
      resolvedParams = await context.params;
    } catch {
      return NextResponse.json({ error: "Paramètres de route invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 Résolution unifiée du profil Kontakt via notre helper centralisé
    const profile = (await findEntityBySlugOrUid(KontaktProfileModel, identifier)) as KontaktProfileDocument | null;

    if (!profile) {
      return NextResponse.json({ error: "Profil Kontakt introuvable dans la matrice." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: profile }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, 'KONTAKT PROFILE GET ERROR');
  }
});

// ==========================================
// PUT : Muter / Mettre à jour un profil Kontakt (Strictement Privé / Aura)
// ==========================================
export const PUT = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    let resolvedParams;
    let body: unknown;
    try {
      resolvedParams = await context.params;
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Requête ou paramètres invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    // 🛡️ Validation et assainissement stricts via Zod (Bloque le Mass Assignment)
    const validation = UpdateKontaktProfileSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Données de mutation de profil invalides.", details: validation.error.flatten() }, { status: 400 });
    }
    const sanitizedData: UpdateKontaktProfileInput = validation.data;

    // 🔍 Recherche unifiée pour trouver le profil par slug ou UID avant mise à jour
    const targetProfile = (await findEntityBySlugOrUid(KontaktProfileModel, identifier, { lean: false })) as KontaktProfileDocument | null;

    if (!targetProfile) {
      return NextResponse.json({ error: "Profil introuvable dans la matrice." }, { status: 404 });
    }

    // Vérification de Souveraineté : Seul le propriétaire ou un Architecte peut modifier
    const isOwner = targetProfile.userUid === currentUser.uid;
    const isArchitect = currentUser.capabilities?.includes('*');

    if (!isOwner && !isArchitect) {
      return NextResponse.json({ error: "Souveraineté violée : tu ne peux modifier ce profil." }, { status: 403 });
    }

    // Si on met à jour le titre professionnel, on génère un nouveau slug
    let newSlug = targetProfile.slug;
    if (sanitizedData.professionalTitle) {
      const baseSlug = slugify(sanitizedData.professionalTitle);
      let finalSlug = baseSlug;
      let slugExists = (await findEntityBySlugOrUid(KontaktProfileModel, finalSlug)) as KontaktProfileDocument | null;
      let counter = 1;
      let safetyCounter = 0;
      // On vérifie que le slug généré n'est pas déjà pris par UN AUTRE profil
      while (slugExists && slugExists.uid !== targetProfile.uid && safetyCounter < 50) {
        finalSlug = `${baseSlug}-${counter}`;
        slugExists = (await findEntityBySlugOrUid(KontaktProfileModel, finalSlug)) as KontaktProfileDocument | null;
        counter++;
        safetyCounter++;
      }
      newSlug = finalSlug;
    }

    const payloadToUpdate = {
      ...sanitizedData,
      ...(sanitizedData.professionalTitle ? { slug: newSlug } : {})
    };

    const updatedProfile = (await KontaktProfileModel.findOneAndUpdate(
      { uid: targetProfile.uid },
      { $set: payloadToUpdate },
      { new: true }
    ).lean()) as KontaktProfileDocument | null;

    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade
    revalidateTag('kontakt-profiles');
    revalidateTag(`kontakt-profile-${identifier}`);
    if (updatedProfile?.slug) revalidateTag(`kontakt-profile-${updatedProfile.slug}`);
    if (updatedProfile?.uid) revalidateTag(`kontakt-profile-${updatedProfile.uid}`);

    return NextResponse.json({
      success: true,
      message: "Le profil Kontakt a muté avec succès.",
      data: updatedProfile
    }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, 'KONTAKT PROFILE PUT ERROR');
  }
});

// ==========================================
// DELETE : Dissoudre un profil Kontakt (Strictement Privé / Aura)
// ==========================================
export const DELETE = withAura(async (_req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    let resolvedParams;
    try {
      resolvedParams = await context.params;
    } catch {
      return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 Utilisation de notre helper unifié pour cibler la suppression
    const targetProfile = (await findEntityBySlugOrUid(KontaktProfileModel, identifier)) as KontaktProfileDocument | null;

    if (!targetProfile) {
      return NextResponse.json({ error: "Profil introuvable pour dissolution." }, { status: 404 });
    }

    // Vérification de Souveraineté
    const isOwner = targetProfile.userUid === currentUser.uid;
    const isArchitect = currentUser.capabilities?.includes('*');

    if (!isOwner && !isArchitect) {
      return NextResponse.json({ error: "Souveraineté violée : dissolution interdite." }, { status: 403 });
    }

    await KontaktProfileModel.deleteOne({ uid: targetProfile.uid });

    // 💥 Invalidation du cache
    revalidateTag('kontakt-profiles');
    revalidateTag(`kontakt-profile-${identifier}`);
    revalidateTag(`kontakt-profile-${targetProfile.uid}`);
    if (targetProfile.slug) revalidateTag(`kontakt-profile-${targetProfile.slug}`);

    return NextResponse.json({
      success: true,
      message: `Le profil a été désintégré de la matrice.`
    }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, 'KONTAKT PROFILE DELETE ERROR');
  }
});