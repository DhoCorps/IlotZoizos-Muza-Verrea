// Fichier : app/api/kontakt/profiles/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { KontaktProfileModel } from '@ilot/infrastructure';
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { getCachedKontaktProfiles } from '@/lib/cache/kontakt.cache';

// ==========================================
// GET : Recenser les profils Kontakt (Public / Silice)
// ==========================================
export const GET = withSilice(async (req: Request, _context: ApiContext) => {
  try {
    let url;
    try {
      url = new URL(req.url);
    } catch (urlErr) {
      return NextResponse.json({ error: "URL de requête invalide." }, { status: 400 });
    }
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
// POST : Sédimenter ou mettre à jour son profil Kontakt (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }
    const userUid = currentUser.uid || 'unknown';
    
    // Génération du Slug basé sur le titre professionnel avec gestion des collisions
    let baseSlug = slugify(body.professionalTitle || 'profil-oiseau');
    let finalSlug = baseSlug;
         
    let slugExists;
    try {
      slugExists = await KontaktProfileModel.findOne({ slug: finalSlug, userUid: { $ne: userUid } }).lean();
    } catch (slugErr) {
      console.error("  [KONTAKT SLUG CHECK ERROR]", slugErr);
    }
    let counter = 1;
    while (slugExists) {
      finalSlug = `${baseSlug}-${counter}`;
      try {
        slugExists = await KontaktProfileModel.findOne({ slug: finalSlug, userUid: { $ne: userUid } }).lean();
      } catch (slugErr) {
        break;
      }
      counter++;
    }

    // Vérifier si un profil existe déjà pour cet Oiseau
    let existing;
    try {
      existing = await KontaktProfileModel.findOne({ userUid }).lean();
    } catch (findErr) {
      console.error("  [KONTAKT EXISTING CHECK ERROR]", findErr);
    }
         
    let profile;
    try {
      if (existing) {
        profile = await KontaktProfileModel.findOneAndUpdate(
          { userUid },
          { $set: { ...body, slug: finalSlug } },
          { new: true }
        ).lean();
      } else {
        const profileUid = `kontakt_${uuidv4()}`;
        profile = await KontaktProfileModel.create({
          ...body,
          uid: profileUid,
          userUid,
          slug: finalSlug,
        });
      }
    } catch (saveErr) {
      console.error("  [KONTAKT PROFILE SAVE ERROR]", saveErr);
      return NextResponse.json({ error: "Échec de la sédimentation du profil en base." }, { status: 500 });
    }
    
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