import { NextResponse } from 'next/server';
import { connectToDatabase } from '@ilot/infrastructure';
import { KontaktProfileModel } from '@ilot/infrastructure';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '../../../../lib/slugify'; // 🪡

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const alignment = searchParams.get('alignment');
    const status = searchParams.get('status');

    const query: any = {};
    if (alignment) query.alignment = alignment;
    if (status) query.availabilityStatus = status;

    const profiles = await KontaktProfileModel.find(query).sort({ createdAt: -1 });
    return NextResponse.json(profiles, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Erreur lors du recensement des profils Kontakt :", error);
    return NextResponse.json({ error: error.message || "Échec du recensement." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Oiseau non identifié. Accès refusé." }, { status: 401 });
    }

    await connectToDatabase();
    const body = await req.json();
    const userUid = (session.user as any).uid || 'unknown';

    // 🪡 Génération du Slug basé sur le titre professionnel
    let baseSlug = slugify(body.professionalTitle || 'profil-oiseau');
    let finalSlug = baseSlug;
    
    let slugExists = await KontaktProfileModel.findOne({ slug: finalSlug, userUid: { $ne: userUid } });
    let counter = 1;
    while (slugExists) {
      finalSlug = `${baseSlug}-${counter}`;
      slugExists = await KontaktProfileModel.findOne({ slug: finalSlug, userUid: { $ne: userUid } });
      counter++;
    }

    // Vérifier si un profil existe déjà pour cet Oiseau
    const existing = await KontaktProfileModel.findOne({ userUid });
    
    let profile;
    if (existing) {
      profile = await KontaktProfileModel.findOneAndUpdate(
        { userUid },
        { $set: { ...body, slug: finalSlug } },
        { new: true }
      );
    } else {
      const profileUid = `kontakt_${uuidv4()}`;
      profile = await KontaktProfileModel.create({
        ...body,
        uid: profileUid,
        userUid,
        slug: finalSlug, // 🪡 Injection de la belle URL
      });
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