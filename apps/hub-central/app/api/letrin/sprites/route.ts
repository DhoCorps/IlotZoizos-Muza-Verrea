export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { LetterSpriteModel } from '@ilot/infrastructure';
import { LetrinSpriteOrchestrator } from '@ilot/shared-core';
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '@/lib/slugify';
import { unstable_cache, revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// 🧠 CACHE SÉCURISÉ : Recensement des polices mis en cache (60s) avec bypass en mode test
async function getCachedFonts() {
  const fetcher = async () => {
    return await LetterSpriteModel.find({}).sort({ createdAt: -1 }).lean();
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  return await unstable_cache(
    fetcher,
    ['letrin-fonts-list'],
    { revalidate: 60, tags: ['fonts', 'letrin'] }
  )();
}

// ==========================================
// 🔍 GET : Recenser toutes les polices Letr'In (Public / Silice)
// ==========================================
export const GET = withSilice(async (_req: NextRequest, _context: ApiContext) => {
  try {
    const fonts = await getCachedFonts();
    return NextResponse.json(fonts, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Erreur globale GET Letr'In Sprites :", error);
    return NextResponse.json({ error: error.message || "Échec du recensement." }, { status: 500 });
  }
});

// ==========================================
// 🚀 POST : Sédimenter une police Letr'In (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
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
      authorUid: currentUser.uid || 'unknown',
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

    // Synchronisation dans le Graphe Neo4j via l'orchestrateur (avec résilience)
    try {
      const orchestrator = new LetrinSpriteOrchestrator();
      await orchestrator.publishFontSprite(fontData, {
        actorUid: fontData.authorUid,
        capabilities: currentUser.capabilities || []
      });
    } catch (neoError) {
      console.error("⚠️ Erreur Neo4j au tissage de Letr'In :", neoError);
    }

    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade
    revalidateTag('fonts');
    revalidateTag('letrin');

    return NextResponse.json({
      success: true,
      message: "Police typographique et sprites sédimentés avec succès.",
      data: newFont
    }, { status: 201 });

  } catch (error: any) {
    console.error("🔥 Erreur globale POST Letr'In Sprites :", error);
    return NextResponse.json({ error: error.message || "Échec de la sédimentation." }, { status: 500 });
  }
});