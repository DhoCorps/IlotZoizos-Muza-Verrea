export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { SujetModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { SujetOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, withOptionalAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { getCachedSujetDetails } from '@/lib/cache/sujets.cache';
import { z } from 'zod';

// 🛡️ Schéma de validation Zod strict pour interdire l'assignation de masse sur les champs sensibles
const UpdateSujetSchema = z.object({
  title: z.string().min(1, "Le titre est requis.").optional(),
  content: z.string().optional(),
  status: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  mediaUrl: z.string().url().nullable().optional(),
}).passthrough();

// ==========================================
// GET : Ausculter un sujet spécifique
// ==========================================
export const GET = withOptionalAura(async (req: NextRequest, context: ApiContext, currentUser?: OiseauUser) => {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    
    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 Tentative via le cache, puis repli sur le helper unifié
    let sujet: any = await getCachedSujetDetails(identifier);
    if (!sujet) {
      sujet = await findEntityBySlugOrUid(SujetModel, identifier);
    }

    if (!sujet) {
      return NextResponse.json({ error: "Ce monologue s'est évaporé dans la brume." }, { status: 404 });
    }

    const userUid = currentUser?.uid;
    const sessionCaps = currentUser?.capabilities || [];
    const isPublic = sujet.status === 'PUBLISHED';
    const isMine = sujet.authorUid === userUid;
    const isArchitect = sessionCaps.includes('*');

    if (!isPublic && !isMine && !isArchitect) {
      return NextResponse.json({ error: "Ce monologue intime t'est fermé." }, { status: 403 });
    }
    return NextResponse.json(sujet, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "SUJET GET ERROR");
  }
});

// ==========================================
// PUT : Mutation du Sujet (Sécurisée par Zod)
// ==========================================
export const PUT = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 Recherche unifiée pour récupérer le sujet par slug ou UID
    const sujet: any = await findEntityBySlugOrUid(SujetModel, identifier);
    if (!sujet) {
      return NextResponse.json({ error: "Sujet introuvable." }, { status: 404 });
    }

    const isAuthor = sujet.authorUid === currentUser.uid;
    const isArchitect = currentUser.capabilities?.includes('*');
    if (!isAuthor && !isArchitect) {
      return NextResponse.json({ error: "Tu ne peux modifier que tes propres monologues." }, { status: 403 });
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    // 🛡️ Validation et assainissement stricts via Zod (bloque le Mass Assignment)
    const validation = UpdateSujetSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({ error: "Données de mutation invalides.", details: validation.error.flatten() }, { status: 400 });
    }
    const sanitizedData = validation.data;

    let updatedSujet;
    try {
      updatedSujet = await SujetModel.findOneAndUpdate(
        { uid: sujet.uid },
        { $set: sanitizedData },
        { new: true }
      ).lean();
    } catch {
      return NextResponse.json({ error: "Échec de la mutation du sujet dans la Silice." }, { status: 500 });
    }
          
    revalidateTag('sujets');
    revalidateTag(`sujet-${identifier}`);
    if (sujet.uid) revalidateTag(`sujet-${sujet.uid}`);
    if (sujet.slug) revalidateTag(`sujet-${sujet.slug}`);

    return NextResponse.json({ success: true, data: updatedSujet }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "SUJET PUT ERROR");
  }
});

// ==========================================
// DELETE : Désintégration / Suppression du Sujet
// ==========================================
export const DELETE = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 Recherche unifiée pour cibler proprement le sujet
    const sujet: any = await findEntityBySlugOrUid(SujetModel, identifier);
    if (!sujet) {
      return NextResponse.json({ error: "Sujet introuvable." }, { status: 404 });
    }

    const isAuthor = sujet.authorUid === currentUser.uid;
    const isArchitect = currentUser.capabilities?.includes('*');
    if (!isAuthor && !isArchitect) {
      return NextResponse.json({ error: "Tu ne peux supprimer que tes propres monologues." }, { status: 403 });
    }

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    try {
      const sujetOrch = new SujetOrchestrator();
      if (typeof sujetOrch.disintegrateSujet === 'function') {
        await sujetOrch.disintegrateSujet(sujet.uid, signature);
      } else {
        await SujetModel.deleteOne({ uid: sujet.uid });
      }
    } catch (orchErr: unknown) {
      const err = orchErr as { status?: number; statusCode?: number; message?: string };
      const status = err.status || err.statusCode || 500;
      return NextResponse.json({ error: err.message || "Erreur lors de la désintégration." }, { status });
    }
          
    revalidateTag('sujets');
    revalidateTag(`sujet-${identifier}`);
    if (sujet.uid) revalidateTag(`sujet-${sujet.uid}`);
    if (sujet.slug) revalidateTag(`sujet-${sujet.slug}`);

    return NextResponse.json({
       success: true,
       message: "Le monologue a été réduit en cendres. Les liens dans le Graphe sont rompus."
    }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "SUJET DELETE ERROR");
  }
});