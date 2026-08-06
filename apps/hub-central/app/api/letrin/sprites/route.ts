import { NextResponse } from 'next/server';
import { connectToDatabase, LetterSpriteModel } from '@ilot/infrastructure';
import { LetrinSpriteOrchestrator } from '@ilot/shared-core';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth"; // Ajuste la profondeur si nécessaire
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '../../../../lib/slugify';

export async function GET() {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR LETRIN SPRITES GET]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let fonts;
    try {
      // 🪡 Ajout de .lean() pour de meilleures performances et compatibilité avec les tests
      fonts = await LetterSpriteModel.find({}).sort({ createdAt: -1 }).lean();
    } catch (queryErr) {
      console.error("🔥 [LETRIN SPRITES QUERY ERROR]", queryErr);
      return NextResponse.json({ error: "Échec de lecture des polices." }, { status: 500 });
    }

    return NextResponse.json(fonts, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale GET Letr'In Sprites :", error);
    return NextResponse.json({ error: error.message || "Échec du recensement." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR LETRIN SPRITES POST]", sessionErr);
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    if (!session || !session.user) {
      return NextResponse.json({ error: "Oiseau non identifié. Accès refusé." }, { status: 401 });
    }

    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR LETRIN SPRITES POST]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    const fontName = body.name || 'Police Anonyme';
    let baseSlug = slugify(fontName);
    let finalSlug = baseSlug;
    
    // 🪡 Sécurisation des doublons d'URL
    try {
      let slugExists = await LetterSpriteModel.findOne({ slug: finalSlug }).lean();
      let counter = 1;
      while (slugExists) {
        finalSlug = `${baseSlug}-${counter}`;
        slugExists = await LetterSpriteModel.findOne({ slug: finalSlug }).lean();
        counter++;
      }
    } catch (slugErr) {
      console.error("🔥 [SLUG VALIDATION ERROR]", slugErr);
      return NextResponse.json({ error: "Erreur de validation de l'empreinte URL." }, { status: 500 });
    }

    const fontUid = `font_${uuidv4()}`;
    const fontData = {
      uid: fontUid,
      name: fontName,
      slug: finalSlug,
      authorUid: (session.user as any).uid || 'unknown',
      gridSize: body.gridSize || { width: 16, height: 16 },
      glyphs: body.glyphs || [],
      status: body.status || 'DRAFT'
    };

    let newFont;
    try {
      newFont = await LetterSpriteModel.create(fontData);
    } catch (createErr) {
      console.error("🔥 [SPRITE CREATE ERROR]", createErr);
      return NextResponse.json({ error: "Échec de sédimentation." }, { status: 500 });
    }

    // Synchronisation dans le Graphe Neo4j
    try {
      const orchestrator = new LetrinSpriteOrchestrator();
      await orchestrator.publishFontSprite(fontData, {
        actorUid: fontData.authorUid,
        capabilities: (session.user as any).capabilities || []
      });
    } catch (neoError) {
      // On ne bloque pas la réponse HTTP si seul Neo4j échoue (logique de résilience)
      console.error("⚠️ Erreur Neo4j au tissage de Letr'In :", neoError);
    }

    return NextResponse.json({
      success: true,
      message: "Police typographique et sprites sédimentés avec succès.",
      data: newFont
    }, { status: 201 });

  } catch (error: any) {
    console.error("🔥 Erreur globale POST Letr'In Sprites :", error);
    return NextResponse.json({ error: error.message || "Échec de la sédimentation." }, { status: 500 });
  }
}