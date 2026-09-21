export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { LibraryBookModel, findEntityBySlugOrUid, ILibraryBook } from '@ilot/infrastructure';
import { BibliotekOrchestrator, BibliotekSyncResult } from '@ilot/shared-core';
import { ActionSignature, CAPABILITIES } from '@ilot/types';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, withOptionalAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { IlotError } from '@ilot/shared-core';
import { z } from 'zod';

// 🛡️ Schéma Zod strict pour interdire l'assignation de masse sur les ouvrages de Bibliotek
const UpdateLibraryBookSchema = z.object({
  title: z.string().min(1, "Le titre est requis.").optional(),
  description: z.string().optional(),
  writingType: z.string().optional(),
  style: z.string().optional(),
  fileUrl: z.string().url().optional(),
  coverUrl: z.string().url().nullable().optional(),
  copyrightClaimed: z.boolean().optional(),
});

// ==========================================
// GET : Ausculter un Ouvrage spécifique (Public / Optionnel Aura)
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

    // 🔍 Utilisation de notre helper unifié (Slug ou UID)
    const book = await findEntityBySlugOrUid(LibraryBookModel, identifier) as ILibraryBook | null;
    if (!book) {
      return NextResponse.json({ success: false, error: "Cet ouvrage s'est évaporé du Sanctuaire." }, { status: 404 });
    }

    const userUid = currentUser?.uid;
    const sessionCaps = currentUser?.capabilities || [];
    const isMine = book.authorUid === userUid;
    const isArchitect = sessionCaps.includes('*');
    const isPublic = book.copyrightClaimed !== undefined;

    if (!isPublic && !isMine && !isArchitect) {
      return NextResponse.json({ success: false, error: "Cet ouvrage intime t'est fermé." }, { status: 403 });
    }

    const myCaps = (isMine || isArchitect) ? [CAPABILITIES.SYSTEM.ALL] : [];
    return NextResponse.json({ ...(book.toObject ? book.toObject() : book), myCapabilities: myCaps }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof IlotError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    return handleRouteError(error, "Erreur interne lors de la lecture de l'ouvrage.");
  }
});

// ==========================================
// PUT : Muter / Modifier un Ouvrage (Strictement Privé / Aura)
// ==========================================
export const PUT = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    let resolvedParams: { slug?: string | string[] } | undefined;
    let body: unknown;
    try {
      resolvedParams = await context.params;
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Corps de requête ou paramètres illisibles." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    if (!identifier) {
      return NextResponse.json({ success: false, error: "Identifiant invalide." }, { status: 400 });
    }

    // 🛡️ Validation et assainissement stricts via Zod (Bloque le Mass Assignment)
    const validation = UpdateLibraryBookSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: "Données de mutation d'ouvrage invalides.", details: validation.error.flatten() }, { status: 400 });
    }
    const sanitizedData = validation.data;

    // 🔍 Recherche unifiée pour s'assurer de l'existence et obtenir l'UID canonique
    const targetBook = await findEntityBySlugOrUid(LibraryBookModel, identifier) as ILibraryBook | null;
    if (!targetBook) {
      return NextResponse.json({ success: false, error: "Ouvrage introuvable pour mutation." }, { status: 404 });
    }

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    let updatedBook: BibliotekSyncResult;
    try {
      // 🌿 L'Orchestrateur se charge de la modification et notifie la Canopée si besoin
      const bibliotekOrch = new BibliotekOrchestrator();
      updatedBook = await bibliotekOrch.updateBook(targetBook.uid, sanitizedData, signature);
    } catch (orchErr: unknown) {
      console.error("  [BIBLIOTEK ORCHESTRATOR PUT ERROR] :", orchErr);
      const errObj = orchErr as { status?: number; statusCode?: number; message?: string };
      const status = orchErr instanceof IlotError ? orchErr.status : (errObj.statusCode || 500);
      const message = orchErr instanceof IlotError ? orchErr.message : (errObj.message || "Échec de la mutation de l'ouvrage.");
      return NextResponse.json({ success: false, error: message }, { status });
    }

    // 💥 Invalidation chirurgicale du cache en cascade
    revalidateTag('bibliotek');
    revalidateTag(`bibliotek-${identifier}`);
    if (updatedBook?.mongo?.uid) {
      revalidateTag(`bibliotek-${updatedBook.mongo.uid}`);
    }
    if (updatedBook?.mongo?.slug) {
      revalidateTag(`bibliotek-${updatedBook.mongo.slug}`);
    }

    return NextResponse.json(updatedBook, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof IlotError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    return handleRouteError(error, "Erreur interne lors de la mutation de l'ouvrage.");
  }
});

// ==========================================
// DELETE : Dissoudre / Brûler un Ouvrage (Strictement Privé / Aura)
// ==========================================
export const DELETE = withAura(async (_req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    let resolvedParams: { slug?: string | string[] } | undefined;
    try {
      resolvedParams = await context.params;
    } catch {
      return NextResponse.json({ success: false, error: "Paramètres invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    if (!identifier) {
      return NextResponse.json({ success: false, error: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 Recherche unifiée pour s'assurer de l'existence et obtenir l'UID canonique
    const targetBook = await findEntityBySlugOrUid(LibraryBookModel, identifier) as ILibraryBook | null;
    if (!targetBook) {
      return NextResponse.json({ success: false, error: "Ouvrage introuvable pour dissolution." }, { status: 404 });
    }

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    try {
      const bibliotekOrch = new BibliotekOrchestrator();
      await bibliotekOrch.disintegrateBook(targetBook.uid, signature);
    } catch (orchErr: unknown) {
      console.error("  [BIBLIOTEK ORCHESTRATOR DELETE ERROR] :", orchErr);
      const errObj = orchErr as { status?: number; statusCode?: number; message?: string };
      const status = orchErr instanceof IlotError ? orchErr.status : (errObj.statusCode || 500);
      const message = orchErr instanceof IlotError ? orchErr.message : (errObj.message || "Échec de la dissolution de l'ouvrage.");
      return NextResponse.json({ success: false, error: message }, { status });
    }

    // 💥 Invalidation chirurgicale du cache en cascade
    revalidateTag('bibliotek');
    revalidateTag(`bibliotek-${identifier}`);
    revalidateTag(`bibliotek-${targetBook.uid}`);
    if (targetBook.slug) {
      revalidateTag(`bibliotek-${targetBook.slug}`);
    }

    return NextResponse.json({ success: true, message: "L'ouvrage a été réduit en cendres et retiré du Sanctuaire." }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof IlotError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    return handleRouteError(error, "Erreur interne lors de la dissolution de l'ouvrage.");
  }
});