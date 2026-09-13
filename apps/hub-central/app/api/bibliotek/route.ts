export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { LibraryBookModel } from '@ilot/infrastructure';
import { BibliotekOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { revalidateTag } from 'next/cache';
import { withAura, withOptionalAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// ==========================================
// GET : Le Sanctuaire des Écrits Libres (Public / Optionnel Aura)
// ==========================================
export const GET = withOptionalAura(async (req: NextRequest, _context: ApiContext, _currentUser?: OiseauUser) => {
  try {
    let url;
    try {
      url = new URL(req.url);
    } catch {
      return NextResponse.json({ error: "URL de requête invalide." }, { status: 400 });
    }

    const filterType = url.searchParams.get('writingType');
    const filterStyle = url.searchParams.get('style');
    const authorUid = url.searchParams.get('authorUid');

    const query: any = {};
    if (filterType && filterType !== 'ALL') query.writingType = filterType;
    if (filterStyle && filterStyle !== 'ALL') query.style = filterStyle;
    if (authorUid) query.authorUid = authorUid;

    const books = await LibraryBookModel.find(query).sort({ createdAt: -1 }).lean();
    const safeBooks = JSON.parse(JSON.stringify(books || []));

    return NextResponse.json({ success: true, data: safeBooks }, { status: 200 });
  } catch (error: any) {
    console.error("🔥 [BIBLIOTEK GET ERROR] :", error);
    return NextResponse.json({ error: error.message || "Erreur interne du sanctuaire." }, { status: 500 });
  }
});

// ==========================================
// POST : Fonder un Ouvrage avec Sceau SHA-256 (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    if (!body.title || !body.fileUrl) {
      return NextResponse.json({ error: "Un ouvrage nécessite au moins un titre et une source sur le Nexus (fileUrl)." }, { status: 400 });
    }

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    let result;
    try {
      const bibliotekOrch = new BibliotekOrchestrator();
      const dataToForge = { 
        ...body, 
        authorUid: currentUser.uid,
        authorSlug: currentUser.slug || currentUser.uid
      };
      result = await bibliotekOrch.fosterBook(dataToForge, signature);
    } catch (orchErr: any) {
      console.error("🔥 [BIBLIOTEK ORCHESTRATOR POST ERROR] :", orchErr);
      const status = orchErr.statusCode || orchErr.status || 500;
      return NextResponse.json({ error: orchErr.message || "L'Îlot repousse cet ouvrage." }, { status });
    }

    revalidateTag('bibliotek');
    revalidateTag(`bibliotek-user-${currentUser.uid}`);
    revalidateTag('bibliotek-public');

    return NextResponse.json({
      success: true,
      message: "Ouvrage sédimenté et scellé par SHA-256 dans le Sanctuaire.",
      data: result.mongo,
      digitalSignature: result.mongo.digitalSignature,
      timestampedAt: result.mongo.timestampedAt
    }, { status: 201 });

  } catch (error: any) {
    console.error("🔥 [BIBLIOTEK POST GLOBAL ERROR] :", error);
    return NextResponse.json({ error: error.message || "Erreur interne du serveur." }, { status: 500 });
  }
});