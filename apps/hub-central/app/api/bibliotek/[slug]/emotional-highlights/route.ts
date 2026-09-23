export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { LibraryBookModel, findEntityBySlugOrUid, ILibraryBook } from '@ilot/infrastructure';
import { BibliotekOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { revalidateTag } from 'next/cache';
import { withAura, withOptionalAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { getCachedBook } from '@/lib/cache/bibliotek.cache'; // 🚀 Import du Cache Bibliotek
import { slugify } from '@/lib/slugify';
import { z } from 'zod';

// ==========================================
// 🛡️ SCHÉMA DE VALIDATION (Surlignage Émotionnel)
// ==========================================
const HighlightSchema = z.object({
  selectedText: z.string().min(1, "Le passage ciblé est requis."),
  emotion: z.string().min(1, "Une vibration (émoji) est requise."),
  comment: z.string().optional()
});

// ==========================================
// GET : Consulter les fulgurances (Notes d'Érudits publiques ou Studio privé avec Cache)
// ==========================================
export const GET = withOptionalAura(async (_req: NextRequest, context: ApiContext, currentUser?: OiseauUser) => {
  try {
    let resolvedParams: { slug?: string | string[] } | undefined;
    try {
      resolvedParams = await context.params;
    } catch {
      return NextResponse.json({ success: false, error: "Paramètres de route invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    if (!identifier) {
      return NextResponse.json({ success: false, error: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 Récupération de l'ouvrage via le cache avec repli sur la base de données
    let book = (await getCachedBook(identifier)) as ILibraryBook | null;
    if (!book) {
      book = (await findEntityBySlugOrUid(LibraryBookModel, identifier)) as ILibraryBook | null;
    }

    if (!book) {
      return NextResponse.json({ success: false, error: "Ouvrage introuvable dans la Silice." }, { status: 404 });
    }

    let highlights = book.emotionalHighlights || [];
    
    // 🔒 Logique de visibilité (Correction : Forcer un booléen strict pour éviter le `undefined` en JSON)
    const isAuthor = Boolean(currentUser && currentUser.uid === book.authorUid);
    const isArchitect = Boolean(currentUser?.capabilities?.includes('*'));
    const isPrivateView = isAuthor || isArchitect;

    if (!isPrivateView) {
      // Le public ne voit QUE le Sceau de l'Érudit
      highlights = highlights.filter((h: any) => h.isScholarSealed === true);
    }

    // Tri par ordre chronologique décroissant (plus récents en premier)
    highlights.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      data: highlights,
      isPrivateView // Désormais strictement `true` ou `false`
    }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, "Erreur lors de la consultation des fulgurances.");
  }
});

// ==========================================
// POST : Envoyer une fulgurance / vibration à l'auteur
// ==========================================
export const POST = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    let resolvedParams: { slug?: string | string[] } | undefined;
    let body: unknown;
    try {
      resolvedParams = await context.params;
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Requête illisible." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    if (!identifier) {
      return NextResponse.json({ success: false, error: "Identifiant invalide." }, { status: 400 });
    }

    const validation = HighlightSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: "Données de fulgurance invalides." }, { status: 400 });
    }

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    const bibliotekOrch = new BibliotekOrchestrator();
    
    // ✨ Transmission de l'Onde (Met à jour le modèle et notifie l'auteur)
    const result = await bibliotekOrch.addEmotionalHighlight(identifier, validation.data, signature);

    revalidateTag('bibliotek');
    revalidateTag(`bibliotek-${identifier}`);

    return NextResponse.json({
      success: true,
      message: "Fulgurance ciblée ajoutée et transmise à l'auteur avec succès.",
      data: result.highlight
    }, { status: 201 });

  } catch (error: unknown) {
    return handleRouteError(error, "Erreur lors de la transmission de la fulgurance.");
  }
});