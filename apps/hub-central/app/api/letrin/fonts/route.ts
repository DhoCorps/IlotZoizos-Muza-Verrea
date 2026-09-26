export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { LetrinFontSpriteModel } from '@ilot/infrastructure';
import { LetrinSpriteOrchestrator } from '@ilot/shared-core';
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { getCachedFontProjects } from '@/lib/cache/letrin.cache';
import { generateFileHash } from '@/lib/cryptoHelper'; // 🛡️ Sceau SHA-256 d'antériorité
import { handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

const CATEGORY_ENUM = ['HUMANE', 'GARALDE', 'DIDINE', 'MECANE', 'LINEALE', 'SCRIPTURE', 'GOTHIQUE', 'FANTAISIE'] as const;

// 🛡️ Schéma Zod strict pour valider la création d'un projet de police Letr'In
const CreateLetrinFontSchema = z.object({
  name: z.string().min(1, "Le nom du projet est requis."),
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

type CreateLetrinFontInput = z.infer<typeof CreateLetrinFontSchema>;

interface LetrinFontDocument {
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
    const projects = await getCachedFontProjects();
    // Sérialisation propre pour éviter les erreurs de type non sérialisable en test/runtime
    let safeProjects: LetrinFontDocument[] = JSON.parse(JSON.stringify(projects || []));

    // 🔍 Filtrage dynamique via les paramètres de recherche
    const { searchParams } = req.nextUrl;
    const category = searchParams.get('category');
    const tag = searchParams.get('tag');
    const frequencyHz = searchParams.get('frequencyHz');

    if (category) {
      safeProjects = safeProjects.filter(p => p.category === category);
    }
    if (tag) {
      safeProjects = safeProjects.filter(p => p.tags && p.tags.includes(tag));
    }
    if (frequencyHz) {
      safeProjects = safeProjects.filter(p => p.frequencyHz === Number(frequencyHz));
    }

    return NextResponse.json({ success: true, data: safeProjects }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, 'LETRIN FONTS GET ERROR');
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
    const validation = CreateLetrinFontSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Données de projet de police invalides.", details: validation.error.flatten() }, { status: 400 });
    }
    const sanitizedData: CreateLetrinFontInput = validation.data;
    const rawBody = (body || {}) as Record<string, unknown>;

    const projectName = sanitizedData.name;
    const authorUid = currentUser.uid || 'unknown';
    const baseSlug = slugify(projectName);
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

    // 🪡 Génération du Sceau Cryptographique (SHA-256) d'Antériorité sur la structure canonique du projet
    const canonicalContent = JSON.stringify({
      name: projectName,
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
    const projectPayload = {
      ...rawBody,
      ...sanitizedData,
      uid: fontUid,
      name: projectName,
      slug: finalSlug,
      authorUid,
      gridSize,
      glyphs,
      status: sanitizedData.status || 'DRAFT',
      digitalSignature,
      timestampedAt,
      copyrightClaimed: true
    };

    let newProject: LetrinFontDocument;
    try {
      newProject = (await LetrinFontSpriteModel.create(projectPayload)) as unknown as LetrinFontDocument;
    } catch (createErr) {
      console.error("  [LETRIN FONTS CREATE ERROR]", createErr);
      return NextResponse.json({ error: "Échec de sédimentation du projet." }, { status: 500 });
    }

    try {
      // 🕸️ Tissage du Graphe relationnel Letr'In via Neo4j
      const orchestrator = new LetrinSpriteOrchestrator();
      await orchestrator.publishFontSprite(projectPayload as any, {
        actorUid: authorUid,
        capabilities: currentUser.capabilities || []
      });
    } catch (neoError) {
      console.error("Erreur Neo4j au tissage de Letr'In :", neoError);
    }

    // 💥 Invalidation rigoureuse du cache
    revalidateTag('fonts');
    revalidateTag('font-projects');
    revalidateTag('letrin');

    return NextResponse.json({ 
      success: true, 
      data: newProject,
      digitalSignature,
      timestampedAt
    }, { status: 201 });

  } catch (error: unknown) {
    return handleRouteError(error, 'LETRIN FONTS POST ERROR');
  }
});