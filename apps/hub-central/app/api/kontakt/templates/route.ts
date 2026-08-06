import { NextResponse } from 'next/server';
import { connectToDatabase, CVTemplateModel } from '@ilot/infrastructure';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth"; // Ajusté selon l'arborescence exacte
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: Request) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR TEMPLATES GET]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let url;
    try {
      url = new URL(req.url);
    } catch (urlErr) {
      return NextResponse.json({ error: "URL de requête invalide." }, { status: 400 });
    }

    const authorUid = url.searchParams.get('authorUid');
    const query: any = {};
    if (authorUid) query.authorUid = authorUid;

    let templates;
    try {
      templates = await CVTemplateModel.find(query).sort({ createdAt: -1 }).lean();
    } catch (queryErr) {
      console.error("🔥 [TEMPLATES QUERY ERROR]", queryErr);
      return NextResponse.json({ error: "Échec de lecture des modèles de CV." }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: templates }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur GET Templates CV :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR TEMPLATES POST]", sessionErr);
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    if (!session || !session.user) {
      return NextResponse.json({ error: "Oiseau non identifié. Publication rejetée." }, { status: 401 });
    }

    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR TEMPLATES POST]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    const userUid = (session.user as any).uid;
    const userName = (session.user as any).name || 'Oiseau Inconnu';

    const templateUid = `tmpl_${uuidv4()}`;
    let newTemplate;
    try {
      newTemplate = await CVTemplateModel.create({
        uid: templateUid,
        authorUid: userUid,
        authorName: userName,
        title: body.title || 'Parchemin Sans Nom',
        description: body.description || 'Modèle forgé dans la matrice.',
        priceShards: body.priceShards || 0,
        barterAccepted: body.barterAccepted ?? true,
        letrinFontFamily: body.letrinFontFamily || 'sans',
        blocks: body.blocks || []
      });
    } catch (createErr) {
      console.error("🔥 [TEMPLATE CREATE ERROR]", createErr);
      return NextResponse.json({ error: "Échec de la sédimentation du modèle en base." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Modèle de CV sédimenté et publié comme artefact.",
      data: newTemplate
    }, { status: 201 });

  } catch (error: any) {
    console.error("🔥 Erreur POST Template CV :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}