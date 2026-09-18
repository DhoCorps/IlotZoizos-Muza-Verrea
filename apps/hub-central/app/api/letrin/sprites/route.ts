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
import { handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

// 🛡️ Schéma Zod strict pour la création d'une police de sprites
const CreateLetterSpriteSchema = z.object({
  name: z.string().min(1, "Le nom de la police est requis.").optional(),
  gridSize: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive()
  }).optional(),
  glyphs: z.array(z.unknown()).optional(),
  status: z.string().optional(),
});

type CreateLetterSpriteInput = z.infer<typeof CreateLetterSpriteSchema>;

interface LetterSpriteDocument {
  uid: string;
  name: string;
  slug: string;
  authorUid: string;
  gridSize: { width: number; height: number };
  glyphs: unknown[];
  status: string;
  digitalSignature?: string;
  timestampedAt?: Date;
  copyrightClaimed?: boolean;
  [key: string]: unknown;
}

export const GET = withSilice(async (_req: NextRequest, _context: ApiContext) => {
  try {
    const fonts = await getCachedFonts();
    // Sérialisation propre pour éviter les erreurs de type non sérialisable
    const safeFonts = JSON.parse(JSON.stringify(fonts || []));
    return NextResponse.json(safeFonts, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, 'LETRIN SPRITES GET ERROR');
  }
});

export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    // 🛡️ Validation et assainissement via Zod
    const validation = CreateLetterSpriteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Données de police de sprites invalides.", details: validation.error.flatten() }, { status: 400 });
    }
    const sanitizedData: CreateLetterSpriteInput = validation.data;
    const rawBody = (body || {}) as Record<string, unknown>;

    const fontName = sanitizedData.name || 'Police Anonyme';
    const baseSlug = slugify(fontName);
    let finalSlug = baseSlug;

    try {
      let slugExists = await LetterSpriteModel.findOne({ slug: finalSlug }).lean();
      let counter = 1;
      let safetyCounter = 0;
      while (slugExists && safetyCounter < 50) {
        finalSlug = `${baseSlug}-${counter}`;
        slugExists = await LetterSpriteModel.findOne({ slug: finalSlug }).lean();
        counter++;
        safetyCounter++;
      }
    } catch (slugErr) {
      console.error("  [SLUG VALIDATION ERROR]", slugErr);
      return NextResponse.json({ error: "Erreur de validation de l'empreinte URL." }, { status: 500 });
    }

    const gridSize = sanitizedData.gridSize || (rawBody.gridSize as { width: number; height: number }) || { width: 16, height: 16 };
    const glyphs = sanitizedData.glyphs || (rawBody.glyphs as unknown[]) || [];
    const authorUid = currentUser.uid || 'unknown';

    // 🪡 Génération du Sceau Cryptographique (SHA-256) d'Antériorité
    const canonicalContent = JSON.stringify({
      name: fontName,
      gridSize,
      glyphs,
      authorUid
    });
    
    const contentBuffer = Buffer.from(canonicalContent, 'utf-8');
    const digitalSignature = generateFileHash(contentBuffer);
    const timestampedAt = new Date();

    const fontUid = `font_${uuidv4()}`;
    const fontData = {
      ...rawBody,
      ...sanitizedData,
      uid: fontUid,
      name: fontName,
      slug: finalSlug,
      authorUid,
      gridSize,
      glyphs,
      status: sanitizedData.status || (rawBody.status as string) || 'DRAFT',
      digitalSignature,
      timestampedAt,
      copyrightClaimed: true
    };

    let newFont: LetterSpriteDocument;
    try {
      newFont = (await LetterSpriteModel.create(fontData)) as unknown as LetterSpriteDocument;
    } catch (createErr) {
      console.error("  [SPRITE CREATE ERROR]", createErr);
      return NextResponse.json({ error: "Échec de sédimentation." }, { status: 500 });
    }

    try {
      const orchestrator = new LetrinSpriteOrchestrator();
      await orchestrator.publishFontSprite(fontData as Parameters<LetrinSpriteOrchestrator['publishFontSprite']>[0], {
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

  } catch (error: unknown) {
    return handleRouteError(error, 'LETRIN SPRITES POST ERROR');
  }
});