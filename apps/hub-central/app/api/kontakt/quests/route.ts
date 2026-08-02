import { NextResponse } from 'next/server';
import { connectToDatabase } from '@ilot/infrastructure';
import { JobQuestModel } from '@ilot/infrastructure';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '../../../../lib/slugify'; // 🪡

export async function GET() {
  try {
    await connectToDatabase();
    const quests = await JobQuestModel.find({ status: 'ACTIVE' }).sort({ createdAt: -1 });
    return NextResponse.json(quests, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Erreur lors du recensement des quêtes :", error);
    return NextResponse.json({ error: error.message || "Échec du recensement." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Oiseau non identifié. Publication refusée." }, { status: 401 });
    }

    await connectToDatabase();
    const body = await req.json();

    // 🪡 Génération du Slug pour la quête
    let baseSlug = slugify(body.title || 'quete-sans-nom');
    let finalSlug = baseSlug;
    
    let slugExists = await JobQuestModel.findOne({ slug: finalSlug });
    let counter = 1;
    while (slugExists) {
      finalSlug = `${baseSlug}-${counter}`;
      slugExists = await JobQuestModel.findOne({ slug: finalSlug });
      counter++;
    }

    const questUid = `quest_${uuidv4()}`;
    const newQuest = await JobQuestModel.create({
      ...body,
      uid: questUid,
      slug: finalSlug, // 🪡 Injection de l'URL propre
      status: 'ACTIVE'
    });

    return NextResponse.json({
      success: true,
      message: "Quête de recrutement publiée avec succès.",
      data: newQuest
    }, { status: 201 });

  } catch (error: any) {
    console.error("🔥 Fracture lors de la publication de la quête :", error);
    return NextResponse.json({ error: error.message || "Échec de la publication." }, { status: 500 });
  }
}