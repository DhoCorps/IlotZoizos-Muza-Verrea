export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { LibraryBookModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { BibliotekOrchestrator } from '@ilot/shared-core';
import { ActionSignature, CAPABILITIES } from '@ilot/types';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, withOptionalAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// ==========================================
// GET : Ausculter un Ouvrage spécifique (Public / Optionnel Aura)
// ==========================================
export const GET = withOptionalAura(async (_req: NextRequest, context: ApiContext, currentUser?: OiseauUser) => {
  try {
    let resolvedParams;
    try {
      resolvedParams = await context.params;
    } catch {
      return NextResponse.json({ error: "Paramètres de route invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 Utilisation de notre helper unifié (Slug ou UID)
    const book: any = await findEntityBySlugOrUid(LibraryBookModel, identifier);
    if (!book) {
      return NextResponse.json({ error: "Cet ouvrage s'est évaporé du Sanctuaire." }, { status: 404 });
    }

    const userUid = currentUser?.uid;
    const sessionCaps = currentUser?.capabilities || [];
    const isMine = book.authorUid === userUid;
    const isArchitect = sessionCaps.includes('*');

    const isPublic = book.copyrightClaimed !== undefined;
    if (!isPublic && !isMine && !isArchitect) {
      return NextResponse.json({ error: "Cet ouvrage intime t'est fermé." }, { status: 403 });
    }

    const myCaps = (isMine || isArchitect) ? [CAPABILITIES.SYSTEM.ALL] : [];
    return NextResponse.json({ ...book, myCapabilities: myCaps }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 [BIBLIOTEK GET SLUG ERROR] :", error);
    return NextResponse.json({ error: error.message || "Erreur interne du serveur." }, { status: 500 });
  }
});

// ==========================================
// PUT : Muter / Modifier un Ouvrage (Strictement Privé / Aura)
// ==========================================
export const PUT = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    let resolvedParams, body;
    try {
      resolvedParams = await context.params;
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corps de requête ou paramètres illisibles." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 Résolution unifiée pour s'assurer de l'existence et obtenir l'UID canonique
    const targetBook: any = await findEntityBySlugOrUid(LibraryBookModel, identifier);
    if (!targetBook) {
      return NextResponse.json({ error: "Ouvrage introuvable pour mutation." }, { status: 404 });
    }

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    let updatedBook;
    try {
      const bibliotekOrch = new BibliotekOrchestrator();
      // L'orchestrateur s'occupe de la mutation globale, en utilisant l'UID canonique
      updatedBook = await bibliotekOrch.updateBook(targetBook.uid, body, signature);
    } catch (orchErr: any) {
      console.error("🔥 [BIBLIOTEK ORCHESTRATOR PUT ERROR] :", orchErr);
      const status = orchErr.statusCode || orchErr.status || 500;
      return NextResponse.json({ error: orchErr.message || "Échec de la mutation de l'ouvrage." }, { status });
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

  } catch (error: any) {
    console.error("🔥 [BIBLIOTEK PUT GLOBAL ERROR] :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
});

// ==========================================
// DELETE : Dissoudre / Brûler un Ouvrage (Strictement Privé / Aura)
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

    // 🔍 Résolution unifiée pour s'assurer de l'existence et obtenir l'UID canonique
    const targetBook: any = await findEntityBySlugOrUid(LibraryBookModel, identifier);
    if (!targetBook) {
      return NextResponse.json({ error: "Ouvrage introuvable pour dissolution." }, { status: 404 });
    }

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    try {
      const bibliotekOrch = new BibliotekOrchestrator();
      // L'orchestrateur désintègre via l'UID canonique
      await bibliotekOrch.disintegrateBook(targetBook.uid, signature);
    } catch (orchErr: any) {
      console.error("🔥 [BIBLIOTEK ORCHESTRATOR DELETE ERROR] :", orchErr);
      const status = orchErr.statusCode || orchErr.status || 500;
      return NextResponse.json({ error: orchErr.message || "Échec de la dissolution de l'ouvrage." }, { status });
    }

    // 💥 Invalidation chirurgicale du cache en cascade
    revalidateTag('bibliotek');
    revalidateTag(`bibliotek-${identifier}`);
    revalidateTag(`bibliotek-${targetBook.uid}`);
    if (targetBook.slug) {
      revalidateTag(`bibliotek-${targetBook.slug}`);
    }

    return NextResponse.json({ success: true, message: "L'ouvrage a été réduit en cendres et retiré du Sanctuaire." }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 [BIBLIOTEK DELETE GLOBAL ERROR] :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
});