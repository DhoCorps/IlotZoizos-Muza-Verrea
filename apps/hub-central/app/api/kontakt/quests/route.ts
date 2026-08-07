import { NextResponse } from 'next/server';
import { connectToDatabase, JobQuestModel } from '@ilot/infrastructure';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '@/lib/slugify';

export async function GET() {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR KONTAKT QUESTS GET]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let quests;
    try {
      quests = await JobQuestModel.find({ status: 'ACTIVE' }).sort({ createdAt: -1 }).lean();
    } catch (queryErr) {
      console.error("🔥 [KONTAKT QUESTS QUERY ERROR]", queryErr);
      return NextResponse.json({ error: "Échec du recensement des quêtes." }, { status: 500 });
    }

    return NextResponse.json(quests, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur lors du recensement des quêtes :", error);
    return NextResponse.json({ error: error.message || "Échec du recensement." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR KONTAKT QUESTS POST]", sessionErr);
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    if (!session || !session.user) {
      return NextResponse.json({ error: "Oiseau non identifié. Publication refusée." }, { status: 401 });
    }

    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR KONTAKT QUESTS POST]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    // Génération du Slug pour la quête
    let baseSlug = slugify(body.title || 'quete-sans-nom');
    let finalSlug = baseSlug;
    
    let slugExists;
    try {
      slugExists = await JobQuestModel.findOne({ slug: finalSlug });
    } catch (slugErr) {
      console.error("🔥 [QUEST SLUG CHECK ERROR]", slugErr);
    }

    let counter = 1;
    while (slugExists) {
      finalSlug = `${baseSlug}-${counter}`;
      try {
        slugExists = await JobQuestModel.findOne({ slug: finalSlug });
      } catch (slugErr) {
        break;
      }
      counter++;
    }

    const questUid = `quest_${uuidv4()}`;
    let newQuest;
    try {
      newQuest = await JobQuestModel.create({
        ...body,
        uid: questUid,
        slug: finalSlug,
        status: 'ACTIVE'
      });
    } catch (createErr) {
      console.error("🔥 [QUEST CREATE ERROR]", createErr);
      return NextResponse.json({ error: "Échec de l'enregistrement de la quête en base." }, { status: 500 });
    }

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