export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { LetrinFontSpriteModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { getCachedFontDetail } from '@/lib/cache/letrin.cache';
import { handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

const CATEGORY_ENUM = ['HUMANE', 'GARALDE', 'DIDINE', 'MECANE', 'LINEALE', 'SCRIPTURE', 'GOTHIQUE', 'FANTAISIE'] as const;

// 🛡️ Schéma Zod strict pour interdire l'assignation de masse sur les champs sensibles
const UpdateLetterSpriteSchema = z.object({
  name: z.string().min(1, "Le nom de la police est requis.").optional(),
  gridSize: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive()
  }).optional(),
  category: z.enum(CATEGORY_ENUM).optional(),
  tags: z.array(z.string()).optional(),
  frequencyHz: z.number().optional(),
  isFrequencyMuted: z.boolean().optional(),
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
  gamification: z.any().optional(),
  glyphs: z.array(z.unknown()).optional(),
  status: z.string().optional(),
});

type UpdateLetterSpriteInput = z.infer<typeof UpdateLetterSpriteSchema>;

interface LetrinFontSpriteDocument {
  uid: string;
  slug?: string;
  authorUid: string;
  name?: string;
  [key: string]: unknown;
}

export const GET = withSilice(async (_req: NextRequest, context: ApiContext) => {
  try {
    let resolvedParams;
    try {
      resolvedParams = await context.params;
    } catch {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    
    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    let font = (await getCachedFontDetail(identifier)) as LetrinFontSpriteDocument | null;
    if (!font) {
      font = (await findEntityBySlugOrUid(LetrinFontSpriteModel, identifier)) as LetrinFontSpriteDocument | null;
    }

    if (!font) {
      return NextResponse.json({ error: "Police introuvable." }, { status: 404 });
    }
    return NextResponse.json(font, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, 'LETRIN SPRITE GET ERROR');
  }
});

export const PUT = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    let resolvedParams;
    let body: unknown;
    try {
      resolvedParams = await context.params;
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    
    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    const validation = UpdateLetterSpriteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Données de mutation de sprite invalides.", details: validation.error.flatten() }, { status: 400 });
    }
    const sanitizedData: UpdateLetterSpriteInput = validation.data;

    const targetSprite = (await findEntityBySlugOrUid(LetrinFontSpriteModel, identifier, { lean: false })) as LetrinFontSpriteDocument | null;
    if (!targetSprite) {
      return NextResponse.json({ error: "Police introuvable." }, { status: 404 });
    }

    const isOwner = targetSprite.authorUid === currentUser.uid;
    const isArchitect = currentUser.capabilities?.includes('*');
    if (!isOwner && !isArchitect) {
      return NextResponse.json({ error: "Souveraineté violée : tu ne peux altérer ce sprite." }, { status: 403 });
    }

    let updated: LetrinFontSpriteDocument | null;
    try {
      updated = (await LetrinFontSpriteModel.findOneAndUpdate(
        { uid: targetSprite.uid },
        { $set: sanitizedData },
        { new: true }
      ).lean()) as LetrinFontSpriteDocument | null;
    } catch (updateErr) {
      return NextResponse.json({ error: "Échec de la mutation du sprite." }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: "Police introuvable." }, { status: 404 });
    }

    revalidateTag('fonts');
    revalidateTag('letrin');
    revalidateTag(`font-${identifier}`);
    if (updated.slug) revalidateTag(`font-${updated.slug}`);
    if (updated.uid) revalidateTag(`font-${updated.uid}`);

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, 'LETRIN SPRITE PUT ERROR');
  }
});

export const DELETE = withAura(async (_req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    let resolvedParams;
    try {
      resolvedParams = await context.params;
    } catch {
      return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
    }
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    
    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    const targetSprite = (await findEntityBySlugOrUid(LetrinFontSpriteModel, identifier)) as LetrinFontSpriteDocument | null;
    if (!targetSprite) {
      return NextResponse.json({ error: "Police introuvable." }, { status: 404 });
    }

    const isOwner = targetSprite.authorUid === currentUser.uid;
    const isArchitect = currentUser.capabilities?.includes('*');
    if (!isOwner && !isArchitect) {
      return NextResponse.json({ error: "Souveraineté violée : dissolution interdite." }, { status: 403 });
    }

    let deleted: LetrinFontSpriteDocument | null;
    try {
      deleted = (await LetrinFontSpriteModel.findOneAndDelete({ uid: targetSprite.uid })) as LetrinFontSpriteDocument | null;
    } catch (delErr) {
      return NextResponse.json({ error: "Erreur lors de la dissolution." }, { status: 500 });
    }

    if (!deleted) {
      return NextResponse.json({ error: "Police introuvable." }, { status: 404 });
    }

    revalidateTag('fonts');
    revalidateTag('letrin');
    revalidateTag(`font-${identifier}`);
    revalidateTag(`font-${targetSprite.uid}`);

    return NextResponse.json({ success: true, message: "Police dissoute avec succès." }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, 'LETRIN SPRITE DELETE ERROR');
  }
});