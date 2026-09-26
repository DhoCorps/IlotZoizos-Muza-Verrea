export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { LetrinFontSpriteModel } from '@ilot/infrastructure';
import { LetrinSpriteOrchestrator } from '@ilot/shared-core';
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { getCachedFonts } from '@/lib/cache/letrin.cache';
import { generateFileHash } from '@/lib/cryptoHelper';
import { handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

// 🛡️ Schéma Zod strict pour la création (exige catégorie, tags, fréquence, SEO)
const CATEGORY_ENUM = ['HUMANE', 'GARALDE', 'DIDINE', 'MECANE', 'LINEALE', 'SCRIPTURE', 'GOTHIQUE', 'FANTAISIE'] as const;

const CreateLetterSpriteSchema = z.object({
  name: z.string().min(1, "Le nom de la police est requis."),
  gridSize: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive()
  }).optional(),
  category: z.enum(CATEGORY_ENUM).default('LINEALE'),
  tags: z.array(z.string()).default([]),
  frequencyHz: z.number().default(432),
  isFrequencyMuted: z.boolean().default(false),
  seo: z.object({
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    ogImageUrl: z.string().optional(),
  }).optional(),
  copyrightMetadata: z.object({
    role: z.string().optional(),
    isExclusiveIlot: z.boolean().optional(),
    license: z.string().optional(),
  }).optional(),
  glyphs: z.array(z.unknown()).optional(),
  status: z.string().optional(),
});

type CreateLetterSpriteInput = z.infer<typeof CreateLetterSpriteSchema>;

interface LetrinFontSpriteDocument {
  uid: string;
  name: string;
  slug: string;
  authorUid: string;
  category: string;
  tags: string[];
  frequencyHz: number;
  isFrequencyMuted: boolean;
  gridSize: { width: number; height: number };
  glyphs: unknown[];
  status: string;
  digitalSignature?: string;
  timestampedAt?: Date;
  copyrightClaimed?: boolean;
  [key: string]: unknown;
}

export const GET = withSilice(async (req: NextRequest, _context: ApiContext) => {
  try {
    const fonts = await getCachedFonts();
    let safeFonts: LetrinFontSpriteDocument[] = JSON.parse(JSON.stringify(fonts || []));

    // 🔍 Filtrage dynamique via l'URL
    const { searchParams } = req.nextUrl;
    const category = searchParams.get('category');
    const tag = searchParams.get('tag');
    const frequencyHz = searchParams.get('frequencyHz');

    if (category) {
      safeFonts = safeFonts.filter(font => font.category === category);
    }
    if (tag) {
      safeFonts = safeFonts.filter(font => font.tags && font.tags.includes(tag));
    }
    if (frequencyHz) {
      safeFonts = safeFonts.filter(font => font.frequencyHz === Number(frequencyHz));
    }

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

    // 🛡️ Validation Zod Stricte
    const validation = CreateLetterSpriteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Données de police de sprites invalides.", details: validation.error.flatten() }, { status: 400 });
    }
    const sanitizedData: CreateLetterSpriteInput = validation.data;
    const rawBody = (body || {}) as Record<string, unknown>;

    const fontName = sanitizedData.name;
    const baseSlug = slugify(fontName);
    let finalSlug = baseSlug;

    try {
      let slugExists = await LetrinFontSpriteModel.findOne({ slug: finalSlug }).lean();
      let counter = 1;
      let safetyCounter = 0;
      while (slugExists && safetyCounter < 50) {
        finalSlug = `${baseSlug}-${counter}`;
        slugExists = await LetrinFontSpriteModel.findOne({ slug: finalSlug }).lean();
        counter++;
        safetyCounter++;
      }
    } catch (slugErr) {
      return NextResponse.json({ error: "Erreur de validation de l'empreinte URL." }, { status: 500 });
    }

    const gridSize = sanitizedData.gridSize || { width: 16, height: 16 };
    const glyphs = sanitizedData.glyphs || [];
    const authorUid = currentUser.uid || 'unknown';

    // 🪡 Sceau Cryptographique (SHA-256)
    const canonicalContent = JSON.stringify({
      name: fontName,
      category: sanitizedData.category,
      tags: sanitizedData.tags,
      frequencyHz: sanitizedData.frequencyHz,
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
      status: sanitizedData.status || 'DRAFT',
      digitalSignature,
      timestampedAt,
      copyrightClaimed: true
    };

    let newFont: LetrinFontSpriteDocument;
    try {
      newFont = (await LetrinFontSpriteModel.create(fontData)) as unknown as LetrinFontSpriteDocument;
    } catch (createErr) {
      return NextResponse.json({ error: "Échec de sédimentation." }, { status: 500 });
    }

    try {
      const orchestrator = new LetrinSpriteOrchestrator();
      await orchestrator.publishFontSprite(fontData as Parameters<LetrinSpriteOrchestrator['publishFontSprite']>[0], {
        actorUid: fontData.authorUid,
        capabilities: currentUser.capabilities || []
      });
    } catch (neoError) {
      console.error("Erreur Neo4j au tissage de Letr'In :", neoError);
    }

    // 💥 Invalidation du cache
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