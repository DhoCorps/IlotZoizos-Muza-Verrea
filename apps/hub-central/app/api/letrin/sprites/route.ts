export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { LetterSpriteModel } from '@ilot/infrastructure';
import { LetrinSpriteOrchestrator } from '@ilot/shared-core';
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { getCachedFonts } from '@/lib/cache/letrin.cache';
import { generateFileHash } from '@/lib/cryptoHelper';

export const GET = withSilice(async (_req: NextRequest, _context: ApiContext) => {
  try {
    const fonts = await getCachedFonts();
    // Sérialisation propre pour éviter les erreurs de type non sérialisable
    const safeFonts = JSON.parse(JSON.stringify(fonts || []));
    return NextResponse.json(safeFonts, { status: 200 });
  } catch (error: any) {
    console.error("  Erreur globale GET Letr'In Sprites :", error);
    return NextResponse.json({ error: error.message || "Échec du recensement." }, { status: 500 });
  }
});

export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    const fontName = body.name || 'Police Anonyme';
    let baseSlug = slugify(fontName);
    let finalSlug = baseSlug;
    try {
      let slugExists = await LetterSpriteModel.findOne({ slug: finalSlug }).lean();
      let counter = 1;
      while (slugExists) {
        finalSlug = `${baseSlug}-${counter}`;
        slugExists = await LetterSpriteModel.findOne({ slug: finalSlug }).lean();
        counter++;
      }
    } catch (slugErr) {
      console.error("  [SLUG VALIDATION ERROR]", slugErr);
      return NextResponse.json({ error: "Erreur de validation de l'empreinte URL." }, { status: 500 });
    }

    // 🪡 Génération du Sceau Cryptographique (SHA-256) d'Antériorité
    const canonicalContent = JSON.stringify({
      name: fontName,
      gridSize: body.gridSize || { width: 16, height: 16 },
      glyphs: body.glyphs || [],
      authorUid: currentUser.uid || 'unknown'
    });
    
    const contentBuffer = Buffer.from(canonicalContent, 'utf-8');
    const digitalSignature = generateFileHash(contentBuffer);
    const timestampedAt = new Date();

    const fontUid = `font_${uuidv4()}`;
    const fontData = {
      uid: fontUid,
      name: fontName,
      slug: finalSlug,
      authorUid: currentUser.uid || 'unknown',
      gridSize: body.gridSize || { width: 16, height: 16 },
      glyphs: body.glyphs || [],
      status: body.status || 'DRAFT',
      digitalSignature,
      timestampedAt,
      copyrightClaimed: true
    };

    let newFont;
    try {
      newFont = await LetterSpriteModel.create(fontData);
    } catch (createErr) {
      console.error("  [SPRITE CREATE ERROR]", createErr);
      return NextResponse.json({ error: "Échec de sédimentation." }, { status: 500 });
    }

    try {
      const orchestrator = new LetrinSpriteOrchestrator();
      await orchestrator.publishFontSprite(fontData, {
        actorUid: fontData.authorUid,
        capabilities: currentUser.capabilities || []
      });
    } catch (neoError) {
      console.error("  Erreur Neo4j au tissage de Letr'In :", neoError);
    }

    revalidateTag('fonts');
    revalidateTag('letrin');

    return NextResponse.json({
      success: true,
      message: "Police typographique et sprites sédimentés avec succès, scellés par SHA-256.",
      data: newFont,
      digitalSignature,
      timestampedAt
    }, { status: 201 });

  } catch (error: any) {
    console.error("  Erreur globale POST Letr'In Sprites :", error);
    return NextResponse.json({ error: error.message || "Échec de la sédimentation." }, { status: 500 });
  }
});