export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { LibraryBookModel } from '@ilot/infrastructure';
import { BibliotekOrchestrator } from '@ilot/shared-core';
import { ActionSignature, CAPABILITIES } from '@ilot/types';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, withOptionalAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { IlotError } from '@ilot/shared-core';

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
    const slug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    if (!slug) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    const book = await LibraryBookModel.findOne({ $or: [{ slug }, { uid: slug }] }).lean();
    if (!book) {
      return NextResponse.json({ error: "Cet ouvrage s'est évaporé du Sanctuaire." }, { status: 404 });
    }

    const userUid = currentUser?.uid;
    const sessionCaps = currentUser?.capabilities || [];
    const isMine = (book as any).authorUid === userUid;
    const isArchitect = sessionCaps.includes('*');

    // Si l'ouvrage n'est pas explicitement public ou partagé, vérification des droits
    const isPublic = (book as any).copyrightClaimed !== undefined; // ou autre règle de visibilité
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
    const slug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    if (!slug) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    let updatedBook;
    try {
      const bibliotekOrch = new BibliotekOrchestrator();
      updatedBook = await bibliotekOrch.updateBook(slug, body, signature);
    } catch (orchErr: any) {
      console.error("🔥 [BIBLIOTEK ORCHESTRATOR PUT ERROR] :", orchErr);
      const status = orchErr.statusCode || orchErr.status || 500;
      return NextResponse.json({ error: orchErr.message || "Échec de la mutation de l'ouvrage." }, { status });
    }

    revalidateTag('bibliotek');
    revalidateTag(`bibliotek-${slug}`);
    if (updatedBook?.mongo?.uid) {
      revalidateTag(`bibliotek-${updatedBook.mongo.uid}`);
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
    const slug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    if (!slug) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    try {
      const bibliotekOrch = new BibliotekOrchestrator();
      await bibliotekOrch.disintegrateBook(slug, signature);
    } catch (orchErr: any) {
      console.error("🔥 [BIBLIOTEK ORCHESTRATOR DELETE ERROR] :", orchErr);
      const status = orchErr.statusCode || orchErr.status || 500;
      return NextResponse.json({ error: orchErr.message || "Échec de la dissolution de l'ouvrage." }, { status });
    }

    revalidateTag('bibliotek');
    revalidateTag(`bibliotek-${slug}`);

    return NextResponse.json({ success: true, message: "L'ouvrage a été réduit en cendres et retiré du Sanctuaire." }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 [BIBLIOTEK DELETE GLOBAL ERROR] :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
});