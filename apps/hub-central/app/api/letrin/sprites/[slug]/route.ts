export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { LetterSpriteModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { getCachedFontDetail } from '@/lib/cache/letrin.cache';

// ==========================================
// GET : Ausculter un sprite spécifique
// ==========================================
export const GET = withSilice(async (_req: Request, context: ApiContext) => {
  try {
    let resolvedParams;
    try {
      resolvedParams = await context.params;
    } catch (err) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    
    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 Tentative via le cache, puis repli sur notre helper unifié (slug ou uid)
    let font: any = await getCachedFontDetail(identifier);
    if (!font) {
      font = await findEntityBySlugOrUid(LetterSpriteModel, identifier);
    }

    if (!font) {
      return NextResponse.json({ error: "Police introuvable." }, { status: 404 });
    }
    return NextResponse.json(font, { status: 200 });
  } catch (error: any) {
    console.error("  Erreur globale GET Letr'In Sprite Slug :", error);
    return NextResponse.json({ error: "Erreur globale." }, { status: 500 });
  }
});

// ==========================================
// PUT : Muter un sprite (Strictement Privé / Aura)
// ==========================================
export const PUT = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    let resolvedParams;
    let body;
    try {
      resolvedParams = await context.params;
      body = await req.json();
    } catch (err) {
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    
    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 Recherche unifiée par slug ou UID pour cibler l'entité
    const targetSprite: any = await findEntityBySlugOrUid(LetterSpriteModel, identifier, { lean: false });
    if (!targetSprite) {
      return NextResponse.json({ error: "Police introuvable." }, { status: 404 });
    }

    // 🛡️ Contrôle de souveraineté strict
    const isOwner = targetSprite.authorUid === currentUser.uid;
    const isArchitect = currentUser.capabilities?.includes('*');
    if (!isOwner && !isArchitect) {
      return NextResponse.json({ error: "Souveraineté violée : tu ne peux altérer ce sprite." }, { status: 403 });
    }

    let updated;
    try {
      updated = await LetterSpriteModel.findOneAndUpdate(
        { uid: targetSprite.uid },
        { $set: body },
        { new: true }
      ).lean();
    } catch (updateErr) {
      console.error("  [SPRITE PUT ERROR]", updateErr);
      return NextResponse.json({ error: "Fracture lors de la mutation." }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: "Police introuvable." }, { status: 404 });
    }

    // 💥 Invalidation en cascade
    revalidateTag('fonts');
    revalidateTag('letrin');
    revalidateTag(`font-${identifier}`);
    if ((updated as any).slug) {
      revalidateTag(`font-${(updated as any).slug}`);
    }
    if ((updated as any).uid) {
      revalidateTag(`font-${(updated as any).uid}`);
    }

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error: any) {
    console.error("  Erreur globale PUT Letr'In Sprite Slug :", error);
    return NextResponse.json({ error: "Erreur globale." }, { status: 500 });
  }
});

// ==========================================
// DELETE : Dissoudre un sprite (Strictement Privé / Aura)
// ==========================================
export const DELETE = withAura(async (_req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    let resolvedParams;
    try {
      resolvedParams = await context.params;
    } catch (err) {
      return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
    }
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    
    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 Utilisation de notre helper unifié pour cibler proprement la suppression
    const targetSprite: any = await findEntityBySlugOrUid(LetterSpriteModel, identifier);
    if (!targetSprite) {
      return NextResponse.json({ error: "Police introuvable." }, { status: 404 });
    }

    // 🛡️ Contrôle de souveraineté strict
    const isOwner = targetSprite.authorUid === currentUser.uid;
    const isArchitect = currentUser.capabilities?.includes('*');
    if (!isOwner && !isArchitect) {
      return NextResponse.json({ error: "Souveraineté violée : dissolution interdite." }, { status: 403 });
    }

    let deleted;
    try {
      deleted = await LetterSpriteModel.findOneAndDelete({ uid: targetSprite.uid });
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
  } catch (error: any) {
    console.error("  Erreur globale DELETE Letr'In Sprite Slug :", error);
    return NextResponse.json({ error: "Erreur globale." }, { status: 500 });
  }
});