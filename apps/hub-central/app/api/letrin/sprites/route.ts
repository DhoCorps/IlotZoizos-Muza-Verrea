import { NextResponse } from 'next/server';
import { connectToDatabase } from '@ilot/infrastructure';
import { LetterSpriteModel } from '@ilot/infrastructure';
import { LetrinSpriteOrchestrator } from '@ilot/shared-core';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '../../../../lib/slugify'; // 🪡

export async function GET() {
  try {
    await connectToDatabase();
    const fonts = await LetterSpriteModel.find({}).sort({ createdAt: -1 });
    return NextResponse.json(fonts, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Erreur lors du recensement des polices Letr'In :", error);
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

    const fontName = body.name || 'Police Anonyme';
    let baseSlug = slugify(fontName);
    let finalSlug = baseSlug;
    
    // 🪡 Sécurisation des doublons d'URL
    let slugExists = await LetterSpriteModel.findOne({ slug: finalSlug });
    let counter = 1;
    while (slugExists) {
      finalSlug = `${baseSlug}-${counter}`;
      slugExists = await LetterSpriteModel.findOne({ slug: finalSlug });
      counter++;
    }

    const fontUid = `font_${uuidv4()}`;
    const fontData = {
      uid: fontUid,
      name: fontName,
      slug: finalSlug, // 🪡 Injection de l'empreinte URL
      authorUid: (session.user as any).uid || 'unknown',
      gridSize: body.gridSize || { width: 16, height: 16 },
      glyphs: body.glyphs || [],
      status: body.status || 'DRAFT'
    };

    // Sauvegarde dans la Silice (MongoDB)
    const newFont = await LetterSpriteModel.create(fontData);

    // Synchronisation dans le Graphe Neo4j
    const orchestrator = new LetrinSpriteOrchestrator();
    try {
      await orchestrator.publishFontSprite(fontData, {
        actorUid: fontData.authorUid,
        capabilities: (session.user as any).capabilities || []
      });
    } catch (neoError) {
      console.error("⚠️ Erreur Neo4j au tissage de Letr'In :", neoError);
    }

    return NextResponse.json({
      success: true,
      message: "Police typographique et sprites sédimentés avec succès.",
      data: newFont
    }, { status: 201 });

  } catch (error: any) {
    console.error("🔥 Fracture lors de la sédimentation de la police :", error);
    return NextResponse.json({ error: error.message || "Échec de la sédimentation." }, { status: 500 });
  }
}