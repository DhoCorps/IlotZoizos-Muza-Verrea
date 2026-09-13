// app/api/poetrik/lexicon/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { LexiconEntryModel } from '@ilot/infrastructure';
import { PoetrikOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { revalidateTag } from 'next/cache';
import { withAura, withOptionalAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// -------------------------------------------------------------------------
// GET : Recenser ou rechercher des mots dans l'Oracle Lexical
// -------------------------------------------------------------------------
export const GET = withOptionalAura(async (req: NextRequest, _context: ApiContext, _currentUser?: OiseauUser) => {
  try {
    const url = new URL(req.url);
    const languageCode = url.searchParams.get('lang');
    const search = url.searchParams.get('search');

    const query: any = {};
    if (languageCode && languageCode !== 'ALL') {
      query.languageCode = languageCode;
    }
    if (search) {
      query.word = { $regex: new RegExp(search, 'i') };
    }

    const entries = await LexiconEntryModel.find(query).limit(50).lean();
    const safeEntries = JSON.parse(JSON.stringify(entries || []));

    return NextResponse.json({ success: true, data: safeEntries }, { status: 200 });
  } catch (error: any) {
    console.error("  [POETRIK LEXICON GET ERROR] :", error);
    return NextResponse.json({ error: error.message || "Erreur interne de l'Oracle." }, { status: 500 });
  }
});

// -------------------------------------------------------------------------
// POST : Forger et sédimenter un mot universel (Strictement Privé / Aura)
// -------------------------------------------------------------------------
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    if (!body.word || !body.phoneticIpa || !body.languageCode) {
      return NextResponse.json(
        { error: "Un mot nécessite au moins un libellé, une phonétique IPA et un code de langue." },
        { status: 400 }
      );
    }

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    let result;
    try {
      const orchestrator = new PoetrikOrchestrator();
      result = await orchestrator.fosterLexiconEntry(body, signature);
    } catch (orchErr: any) {
      console.error("  [POETRIK ORCHESTRATOR POST ERROR] :", orchErr);
      const status = orchErr.statusCode || orchErr.status || 500;
      return NextResponse.json({ error: orchErr.message || "L'Îlot repousse ce mot." }, { status });
    }

    revalidateTag('poetrik-lexicon');
    revalidateTag(`lexicon-lang-${body.languageCode}`);

    return NextResponse.json({
      success: true,
      message: "Entrée lexicale sédimentée avec succès dans l'Oracle.",
      data: result.mongo
    }, { status: 201 });

  } catch (error: any) {
    console.error("  [POETRIK LEXICON POST GLOBAL ERROR] :", error);
    return NextResponse.json({ error: error.message || "Erreur interne du serveur." }, { status: 500 });
  }
});