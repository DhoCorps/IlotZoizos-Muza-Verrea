// Fichier : app/api/kontakt/profiles/[slug]/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { KontaktProfileModel } from '@ilot/infrastructure';
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { getCachedKontaktProfiles } from '@/lib/cache/kontakt.cache';

// ==========================================
// GET : Recenser tous les profils Kontakt (Public / Silice)
// ==========================================
export const GET = withSilice(async (req: Request, _context: ApiContext) => {
  try {
    const url = new URL(req.url);
    const searchParams = url.searchParams;
    const alignment = searchParams.get('alignment');
    const status = searchParams.get('status');
    const profiles = await getCachedKontaktProfiles(alignment, status);
    return NextResponse.json(profiles, { status: 200 });
  } catch (error: any) {
    console.error("  Erreur lors du recensement des profils Kontakt :", error);
    return NextResponse.json({ error: error.message || "Échec du recensement." }, { status: 500 });
  }
});

// ==========================================
// POST : Création initiale d'un profil Kontakt (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const body = await req.json();
    const userUid = currentUser.uid || 'unknown';

    // 1. Vérifier si un profil existe déjà pour cet Oiseau
    const existing = await KontaktProfileModel.findOne({ userUid }).lean();
    if (existing) {
      return NextResponse.json(
        { error: "Un profil Kontakt existe déjà pour cet oiseau. Utilisez la route de modification (PUT) à la place." },
        { status: 409 }
      );
    }

    // 2. Génération unique du Slug basé sur le titre professionnel avec garde-fou anti-boucle
    const baseSlug = slugify(body.professionalTitle || 'profil-oiseau');
    let finalSlug = baseSlug;
         
    let slugExists = await KontaktProfileModel.findOne({ slug: finalSlug }).lean();
    let counter = 1;
    let safetyCounter = 0;
    while (slugExists && safetyCounter < 50) {
      finalSlug = `${baseSlug}-${counter}`;
      slugExists = await KontaktProfileModel.findOne({ slug: finalSlug }).lean();
      counter++;
      safetyCounter++;
    }

    // 3. Création et sédimentation en base
    const profileUid = `kontakt_${uuidv4()}`;
    const profile = await KontaktProfileModel.create({
      ...body,
      uid: profileUid,
      userUid,
      slug: finalSlug,
    });

    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade
    revalidateTag('kontakt-profiles');
    if ((profile as any)?.slug) {
      revalidateTag(`kontakt-profile-${(profile as any).slug}`);
    }
    return NextResponse.json({
      success: true,
      message: "Profil Kontakt sédimenté avec succès.",
      data: profile
    }, { status: 201 });
  } catch (error: any) {
    console.error("  Fracture lors de la sédimentation du profil Kontakt :", error);
    return NextResponse.json({ error: error.message || "Échec de la sédimentation." }, { status: 500 });
  }
});