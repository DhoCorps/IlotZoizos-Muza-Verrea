export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { LetrinFontSpriteModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

const CATEGORY_ENUM = ['HUMANE', 'GARALDE', 'DIDINE', 'MECANE', 'LINEALE', 'SCRIPTURE', 'GOTHIQUE', 'FANTAISIE'] as const;

// 🛡️ Schéma Zod strict pour interdire l'assignation de masse sur les projets de polices
const UpdateLetrinFontSchema = z.object({
  name: z.string().min(1, "Le nom du projet de police est requis.").optional(),
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

type UpdateLetrinFontInput = z.infer<typeof UpdateLetrinFontSchema>;

interface LetrinFontDocument {
  uid: string;
  slug?: string;
  authorUid: string;
  name?: string;
  [key: string]: unknown;
}

// ==========================================
// 🚀 PUT : Muter un projet de police (Strictement Privé / Aura)
// ==========================================
export const PUT = withAura(async (request: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    let resolvedParams;
    let body: unknown;
    try {
      resolvedParams = await context.params;
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Requête ou paramètres invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    // 🛡️ Validation et assainissement stricts via Zod (Bloque le Mass Assignment)
    const validation = UpdateLetrinFontSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Données de mutation de projet invalides.", details: validation.error.flatten() }, { status: 400 });
    }
    const sanitizedData: UpdateLetrinFontInput = validation.data;

    // 🔍 Recherche unifiée par slug ou UID sur le Modèle Maître
    const targetProject = (await findEntityBySlugOrUid(LetrinFontSpriteModel, identifier, { lean: false })) as LetrinFontDocument | null;
    if (!targetProject) {
      return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
    }

    // 🛡️ Contrôle de souveraineté strict
    const isOwner = targetProject.authorUid === currentUser.uid;
    const isArchitect = currentUser.capabilities?.includes('*');
    if (!isOwner && !isArchitect) {
      return NextResponse.json({ error: "Souveraineté violée : tu ne peux altérer cette typographie." }, { status: 403 });
    }

    let updated: LetrinFontDocument | null;
    try {
      updated = (await LetrinFontSpriteModel.findOneAndUpdate(
        { uid: targetProject.uid }, 
        { $set: sanitizedData }, 
        { new: true }
      ).lean()) as LetrinFontDocument | null;
    } catch (updateErr) {
      console.error("🔥 [FONTS PUT UPDATE ERROR]", updateErr);
      return NextResponse.json({ error: "Échec de la mutation du projet." }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
    }

    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade
    revalidateTag('fonts');
    revalidateTag('letrin');
    revalidateTag('font-projects');
    revalidateTag(`font-${identifier}`);
    if (updated.slug) {
      revalidateTag(`font-${updated.slug}`);
    }
    if (updated.uid) {
      revalidateTag(`font-${updated.uid}`);
    }

    return NextResponse.json({ success: true, data: updated }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, 'FONTS PUT ERROR');
  }
});

// ==========================================
// 🗑️ DELETE : Dissoudre un projet de police (Strictement Privé / Aura)
// ==========================================
export const DELETE = withAura(async (_request: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
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

    // 🔍 Recherche unifiée par slug ou UID sur le Modèle Maître
    const targetProject = (await findEntityBySlugOrUid(LetrinFontSpriteModel, identifier)) as LetrinFontDocument | null;
    if (!targetProject) {
      return NextResponse.json({ error: "Projet introuvable pour dissolution." }, { status: 404 });
    }

    // 🛡️ Contrôle de souveraineté strict
    const isOwner = targetProject.authorUid === currentUser.uid;
    const isArchitect = currentUser.capabilities?.includes('*');
    if (!isOwner && !isArchitect) {
      return NextResponse.json({ error: "Souveraineté violée : dissolution interdite." }, { status: 403 });
    }

    let deleted: LetrinFontDocument | null;
    try {
      deleted = (await LetrinFontSpriteModel.findOneAndDelete({ uid: targetProject.uid })) as LetrinFontDocument | null;
    } catch (delErr) {
      console.error("🔥 [FONTS DELETE ERROR]", delErr);
      return NextResponse.json({ error: "Échec de la dissolution du projet." }, { status: 500 });
    }

    if (!deleted) {
      return NextResponse.json({ error: "Projet introuvable pour dissolution." }, { status: 404 });
    }

    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade
    revalidateTag('fonts');
    revalidateTag('letrin');
    revalidateTag('font-projects');
    revalidateTag(`font-${identifier}`);
    revalidateTag(`font-${targetProject.uid}`);

    return NextResponse.json({ success: true, message: "Projet dissous avec succès." }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, 'FONTS DELETE ERROR');
  }
});