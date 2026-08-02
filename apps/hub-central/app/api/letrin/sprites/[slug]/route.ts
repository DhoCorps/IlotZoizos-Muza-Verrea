import { NextResponse } from 'next/server';
import { connectToDatabase } from '@ilot/infrastructure';
import { LetterSpriteModel } from '@ilot/infrastructure';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  try {
    await connectToDatabase();
    // 🪡 On cherche maintenant via le slug !
    const font = await LetterSpriteModel.findOne({ slug: params.slug });
    if (!font) {
      return NextResponse.json({ error: "Police introuvable dans la matrice." }, { status: 404 });
    }
    return NextResponse.json(font, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Erreur lors de la lecture de la police :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { slug: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Oiseau non identifié. Mutation refusée." }, { status: 401 });
    }

    await connectToDatabase();
    const body = await req.json();

    // 🪡 Mise à jour ciblée via le slug
    const updated = await LetterSpriteModel.findOneAndUpdate(
      { slug: params.slug },
      { $set: body },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Police introuvable pour mutation." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Fracture lors de la mutation de la police :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { slug: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Oiseau non identifié. Dissolution refusée." }, { status: 401 });
    }

    await connectToDatabase();
    // 🪡 Suppression ciblée via le slug
    const deleted = await LetterSpriteModel.findOneAndDelete({ slug: params.slug });
    if (!deleted) {
      return NextResponse.json({ error: "Police introuvable pour dissolution." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Police dissoute avec succès." }, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Erreur lors de la dissolution de la police :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}