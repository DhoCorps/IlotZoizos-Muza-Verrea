import { NextResponse } from 'next/server';
import { connectToDatabase, KontaktProfileModel } from '@ilot/infrastructure';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '@/lib/slugify';

// ==========================================
// GET : Recenser tous les profils Kontakt
// ==========================================
export async function GET(req: Request) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR KONTAKT PROFILES GET]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let url;
    try {
      url = new URL(req.url);
    } catch (urlErr) {
      return NextResponse.json({ error: "URL de requête invalide." }, { status: 400 });
    }

    const searchParams = url.searchParams;
    const alignment = searchParams.get('alignment');
    const status = searchParams.get('status');

    const query: any = {};
    if (alignment) query.alignment = alignment;
    if (status) query.availabilityStatus = status;

    let profiles;
    try {
      profiles = await KontaktProfileModel.find(query).sort({ createdAt: -1 }).lean();
    } catch (queryErr) {
      console.error("🔥 [KONTAKT PROFILES QUERY ERROR]", queryErr);
      return NextResponse.json({ error: "Échec du recensement des profils Kontakt." }, { status: 500 });
    }

    return NextResponse.json(profiles, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur lors du recensement des profils Kontakt :", error);
    return NextResponse.json({ error: error.message || "Échec du recensement." }, { status: 500 });
  }
}

// ==========================================
// POST : Création initiale d'un profil Kontakt
// ==========================================
export async function POST(req: Request) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR KONTAKT PROFILES POST]", sessionErr);
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    if (!session || !session.user) {
      return NextResponse.json({ error: "Oiseau non identifié. Accès refusé." }, { status: 401 });
    }

    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR KONTAKT PROFILES POST]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    const userUid = (session.user as any).uid || 'unknown';

    // 1. Vérifier si un profil existe déjà pour cet Oiseau (Interdiction du double POST)
    let existing;
    try {
      existing = await KontaktProfileModel.findOne({ userUid });
    } catch (findErr) {
      console.error("🔥 [KONTAKT EXISTING CHECK ERROR]", findErr);
      return NextResponse.json({ error: "Échec de vérification du profil existant." }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json(
        { error: "Un profil Kontakt existe déjà pour cet oiseau. Utilisez la route de modification (PUT) à la place." },
        { status: 409 }
      );
    }

    // 2. Génération unique et définitive du Slug basé sur le titre professionnel
    let baseSlug = slugify(body.professionalTitle || 'profil-oiseau');
    let finalSlug = baseSlug;
    
    let slugExists;
    try {
      slugExists = await KontaktProfileModel.findOne({ slug: finalSlug });
    } catch (slugErr) {
      console.error("🔥 [KONTAKT SLUG CHECK ERROR]", slugErr);
    }

    let counter = 1;
    while (slugExists) {
      finalSlug = `${baseSlug}-${counter}`;
      try {
        slugExists = await KontaktProfileModel.findOne({ slug: finalSlug });
      } catch (slugErr) {
        break;
      }
      counter++;
    }

    // 3. Création pure et sédimentation en base
    let profile;
    try {
      const profileUid = `kontakt_${uuidv4()}`;
      profile = await KontaktProfileModel.create({
        ...body,
        uid: profileUid,
        userUid,
        slug: finalSlug,
      });
    } catch (saveErr) {
      console.error("🔥 [KONTAKT PROFILE SAVE ERROR]", saveErr);
      return NextResponse.json({ error: "Échec de la sédimentation du profil en base." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Profil Kontakt sédimenté avec succès.",
      data: profile
    }, { status: 201 });

  } catch (error: any) {
    console.error("🔥 Fracture lors de la sédimentation du profil Kontakt :", error);
    return NextResponse.json({ error: error.message || "Échec de la sédimentation." }, { status: 500 });
  }
}