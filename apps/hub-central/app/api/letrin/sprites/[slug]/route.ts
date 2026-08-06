import { NextResponse } from 'next/server';
import { connectToDatabase, LetterSpriteModel } from '@ilot/infrastructure';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth"; // 🪡 Ajuste la profondeur si nécessaire

interface RouteParams { params: Promise<{ slug: string }> }

export async function GET(req: Request, { params }: RouteParams) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR SPRITE GET]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let resolvedParams;
    try {
      resolvedParams = await params;
    } catch (err) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    let font;
    try {
      font = await LetterSpriteModel.findOne({ slug: resolvedParams.slug }).lean();
    } catch (queryErr) {
      console.error("🔥 [SPRITE GET ERROR]", queryErr);
      return NextResponse.json({ error: "Fracture lors de la lecture." }, { status: 500 });
    }

    if (!font) return NextResponse.json({ error: "Police introuvable." }, { status: 404 });
    return NextResponse.json(font, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale GET Letr'In Sprite Slug :", error);
    return NextResponse.json({ error: "Erreur globale." }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: RouteParams) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR SPRITE PUT]", sessionErr);
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    if (!session || !session.user) {
      return NextResponse.json({ error: "Oiseau non identifié. Mutation refusée." }, { status: 401 });
    }

    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR SPRITE PUT]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let resolvedParams;
    let body;
    try {
      resolvedParams = await params;
      body = await req.json();
    } catch (err) {
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }

    let updated;
    try {
      updated = await LetterSpriteModel.findOneAndUpdate(
        { slug: resolvedParams.slug },
        { $set: body },
        { new: true }
      ).lean();
    } catch (updateErr) {
      console.error("🔥 [SPRITE PUT ERROR]", updateErr);
      return NextResponse.json({ error: "Fracture lors de la mutation." }, { status: 500 });
    }

    if (!updated) return NextResponse.json({ error: "Police introuvable." }, { status: 404 });
    return NextResponse.json({ success: true, data: updated }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale PUT Letr'In Sprite Slug :", error);
    return NextResponse.json({ error: "Erreur globale." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR SPRITE DELETE]", sessionErr);
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    if (!session || !session.user) {
      return NextResponse.json({ error: "Oiseau non identifié. Dissolution refusée." }, { status: 401 });
    }

    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR SPRITE DELETE]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let resolvedParams;
    try {
      resolvedParams = await params;
    } catch (err) {
      return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
    }

    let deleted;
    try {
      deleted = await LetterSpriteModel.findOneAndDelete({ slug: resolvedParams.slug });
    } catch (delErr) {
      console.error("🔥 [SPRITE DELETE ERROR]", delErr);
      return NextResponse.json({ error: "Erreur lors de la dissolution." }, { status: 500 });
    }

    if (!deleted) return NextResponse.json({ error: "Police introuvable." }, { status: 404 });
    return NextResponse.json({ success: true, message: "Police dissoute avec succès." }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale DELETE Letr'In Sprite Slug :", error);
    return NextResponse.json({ error: "Erreur globale." }, { status: 500 });
  }
}