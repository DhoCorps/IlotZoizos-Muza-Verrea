export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { LetterSpriteModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { getCachedFontDetail } from '@/lib/cache/letrin.cache';
import { IlotError } from '@ilot/shared-core';
import { handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

// 🛡️ Schéma Zod strict pour interdire l'assignation de masse sur les champs sensibles des sprites
const UpdateLetterSpriteSchema = z.object({
  name: z.string().min(1, "Le nom de la police est requis.").optional(),
  gridSize: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive()
  }).optional(),
  glyphs: z.array(z.unknown()).optional(),
  status: z.string().optional(),
});

type UpdateLetterSpriteInput = z.infer<typeof UpdateLetterSpriteSchema>;

interface LetterSpriteDocument {
  uid: string;
  slug?: string;
  authorUid: string;
  name?: string;
  [key: string]: unknown;
}

// ==========================================
// GET : Ausculter un sprite spécifique
// ==========================================
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

    // 🔍 Tentative via le cache, puis repli sur notre helper unifié (slug ou uid)
    let font = (await getCachedFontDetail(identifier)) as LetterSpriteDocument | null;
    if (!font) {
      font = (await findEntityBySlugOrUid(LetterSpriteModel, identifier)) as LetterSpriteDocument | null;
    }

    if (!font) {
      return NextResponse.json({ error: "Police introuvable." }, { status: 404 });
    }
    return NextResponse.json(font, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, 'LETRIN SPRITE GET ERROR');
  }
});

// ==========================================
// PUT : Muter un sprite (Strictement Privé / Aura)
// ==========================================
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

    // 🛡️ Validation et assainissement stricts via Zod pour bloquer le Mass Assignment
    const validation = UpdateLetterSpriteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Données de mutation de sprite invalides.", details: validation.error.flatten() }, { status: 400 });
    }
    const sanitizedData: UpdateLetterSpriteInput = validation.data;

    // 🔍 Recherche unifiée par slug ou UID pour cibler l'entité
    const targetSprite = (await findEntityBySlugOrUid(LetterSpriteModel, identifier, { lean: false })) as LetterSpriteDocument | null;
    if (!targetSprite) {
      return NextResponse.json({ error: "Police introuvable." }, { status: 404 });
    }

    // 🛡️ Contrôle de souveraineté strict
    const isOwner = targetSprite.authorUid === currentUser.uid;
    const isArchitect = currentUser.capabilities?.includes('*');
    if (!isOwner && !isArchitect) {
      return NextResponse.json({ error: "Souveraineté violée : tu ne peux altérer ce sprite." }, { status: 403 });
    }

    let updated: LetterSpriteDocument | null;
    try {
      updated = (await LetterSpriteModel.findOneAndUpdate(
        { uid: targetSprite.uid },
        { $set: sanitizedData },
        { new: true }
      ).lean()) as LetterSpriteDocument | null;
    } catch (updateErr) {
      console.error("  [SPRITE PUT ERROR]", updateErr);
      return NextResponse.json({ error: "Échec de la mutation du sprite." }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: "Police introuvable." }, { status: 404 });
    }

    // 💥 Invalidation en cascade
    revalidateTag('fonts');
    revalidateTag('letrin');
    revalidateTag(`font-${identifier}`);
    if (updated.slug) {
      revalidateTag(`font-${updated.slug}`);
    }
    if (updated.uid) {
      revalidateTag(`font-${updated.uid}`);
    }

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, 'LETRIN SPRITE PUT ERROR');
  }
});

// ==========================================
// DELETE : Dissoudre un sprite (Strictement Privé / Aura)
// ==========================================
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

    // 🔍 Utilisation de notre helper unifié pour cibler proprement la suppression
    const targetSprite = (await findEntityBySlugOrUid(LetterSpriteModel, identifier)) as LetterSpriteDocument | null;
    if (!targetSprite) {
      return NextResponse.json({ error: "Police introuvable." }, { status: 404 });
    }

    // 🛡️ Contrôle de souveraineté strict
    const isOwner = targetSprite.authorUid === currentUser.uid;
    const isArchitect = currentUser.capabilities?.includes('*');
    if (!isOwner && !isArchitect) {
      return NextResponse.json({ error: "Souveraineté violée : dissolution interdite." }, { status: 403 });
    }

    let deleted: LetterSpriteDocument | null;
    try {
      deleted = (await LetterSpriteModel.findOneAndDelete({ uid: targetSprite.uid })) as LetterSpriteDocument | null;
    } catch (delErr) {
      console.error("  [SPRITE DELETE ERROR]", delErr);
      return NextResponse.json({ error: "Erreur lors de la dissolution." }, { status: 500 });
    }

    if (!deleted) {
      return NextResponse.json({ error: "Police introuvable." }, { status: 404 });
    }

    // 💥 Invalidation en cascade
    revalidateTag('fonts');
    revalidateTag('letrin');
    revalidateTag(`font-${identifier}`);
    revalidateTag(`font-${targetSprite.uid}`);

    return NextResponse.json({ success: true, message: "Police dissoute avec succès." }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, 'LETRIN SPRITE DELETE ERROR');
  }
});