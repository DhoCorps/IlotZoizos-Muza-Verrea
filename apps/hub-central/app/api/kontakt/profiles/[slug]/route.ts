import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { connectToDatabase, KontaktProfileModel } from '@ilot/infrastructure';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// ==========================================
// GET : Ausculter un profil Kontakt spécifique
// ==========================================
export async function GET(req: Request, { params }: RouteParams) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR KONTAKT PROFILE GET]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let slug;
    try {
      const resolvedParams = await params;
      slug = resolvedParams.slug;
    } catch (paramErr) {
      return NextResponse.json({ error: "Identifiant de profil invalide." }, { status: 400 });
    }
    
    let profile;
    try {
      profile = await KontaktProfileModel.findOne({ 
        $or: [{ slug: slug }, { uid: slug }, { userUid: slug }] 
      }).lean();
    } catch (queryErr) {
      console.error("🔥 [KONTAKT PROFILE QUERY ERROR]", queryErr);
      return NextResponse.json({ error: "Échec de lecture du profil." }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: "Ce profil Kontakt est introuvable dans la matrice." }, { status: 404 });
    }

    return NextResponse.json(profile, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur GET Kontakt Profile :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}

// ==========================================
// PUT : Mettre à jour son profil Kontakt
// ==========================================
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR KONTAKT PROFILE PUT]", sessionErr);
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    const userUid = (session?.user as any)?.uid;
    const sessionCaps = (session?.user as any)?.capabilities || [];

    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR KONTAKT PROFILE PUT]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let slug;
    try {
      const resolvedParams = await params;
      slug = resolvedParams.slug;
    } catch (paramErr) {
      return NextResponse.json({ error: "Identifiant de profil invalide." }, { status: 400 });
    }

    let profile;
    try {
      profile = await KontaktProfileModel.findOne({ 
        $or: [{ slug: slug }, { uid: slug }, { userUid: slug }] 
      });
    } catch (queryErr) {
      console.error("🔥 [KONTAKT PROFILE UPDATE QUERY ERROR]", queryErr);
      return NextResponse.json({ error: "Échec de recherche du profil." }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: "Profil introuvable." }, { status: 404 });
    }

    const isOwner = profile.userUid === userUid;
    const isArchitect = sessionCaps.includes('*');

    if (!isOwner && !isArchitect) {
      return NextResponse.json({ error: "Tu ne peux modifier que ton propre profil Kontakt." }, { status: 403 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    let updatedProfile;
    try {
      updatedProfile = await KontaktProfileModel.findOneAndUpdate(
        { uid: profile.uid },
        { $set: body },
        { new: true }
      ).lean();
    } catch (updateErr) {
      console.error("🔥 [KONTAKT PROFILE SAVE ERROR]", updateErr);
      return NextResponse.json({ error: "Échec de la mutation du profil." }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: updatedProfile }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur PUT Kontakt Profile :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}

// ==========================================
// DELETE : Dissoudre un profil Kontakt
// ==========================================
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR KONTAKT PROFILE DELETE]", sessionErr);
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    const userUid = (session?.user as any)?.uid;
    const sessionCaps = (session?.user as any)?.capabilities || [];

    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR KONTAKT PROFILE DELETE]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let slug;
    try {
      const resolvedParams = await params;
      slug = resolvedParams.slug;
    } catch (paramErr) {
      return NextResponse.json({ error: "Identifiant de profil invalide." }, { status: 400 });
    }

    let profile;
    try {
      profile = await KontaktProfileModel.findOne({ 
        $or: [{ slug: slug }, { uid: slug }, { userUid: slug }] 
      });
    } catch (queryErr) {
      console.error("🔥 [KONTAKT PROFILE DELETE QUERY ERROR]", queryErr);
      return NextResponse.json({ error: "Échec de recherche du profil." }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: "Profil introuvable." }, { status: 404 });
    }

    const isOwner = profile.userUid === userUid;
    const isArchitect = sessionCaps.includes('*');

    if (!isOwner && !isArchitect) {
      return NextResponse.json({ error: "Action non autorisée sur ce profil." }, { status: 403 });
    }

    try {
      await KontaktProfileModel.deleteOne({ uid: profile.uid });
    } catch (delErr) {
      console.error("🔥 [KONTAKT PROFILE DELETE ERROR]", delErr);
      return NextResponse.json({ error: "Échec de la dissolution du profil." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Le profil Kontakt a été dissous de la matrice." }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur DELETE Kontakt Profile :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}