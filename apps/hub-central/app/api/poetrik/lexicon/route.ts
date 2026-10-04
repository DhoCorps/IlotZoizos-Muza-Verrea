// apps/hub-central/app/api/poetrik/lexicon/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { LexiconEntryModel } from '@ilot/infrastructure';
import { PoetrikOrchestrator } from '@ilot/shared-core';
import { LexiconEntrySchema } from '@ilot/types'; // 👈 On utilise NOTRE source de vérité
import { ActionSignature } from '@ilot/types';
import { revalidateTag } from 'next/cache';
import { withAura, withOptionalAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';

// -------------------------------------------------------------------------
// GET : Recenser ou rechercher des mots dans l'Oracle Lexical (AUTO-COMPLÉTION)
// -------------------------------------------------------------------------
export const GET = withOptionalAura(async (req: NextRequest, _context: ApiContext, _currentUser?: OiseauUser) => {
  try {
    const url = new URL(req.url);
    const languageCode = url.searchParams.get('lang');
    const search = url.searchParams.get('search');

    const query: Record<string, unknown> = {};
    if (languageCode && languageCode !== 'ALL') {
      query.languageCode = languageCode;
    }
    if (search) {
      query.word = { $regex: new RegExp(`^${search}`, 'i') }; // 🚀 Optimisé pour "commence par" au lieu de "contient"
    }

    // On limite à 20 résultats pour l'auto-complétion temps réel
    const entries = await LexiconEntryModel.find(query).limit(20).lean();
    const safeEntries = JSON.parse(JSON.stringify(entries || []));

    // ⚡ Mise en cache d'une heure pour soulager la base lors de la frappe
    return NextResponse.json({ success: true, data: safeEntries }, { 
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    });
  } catch (error: unknown) {
    return handleRouteError(error, 'POETRIK LEXICON GET ERROR');
  }
});

// -------------------------------------------------------------------------
// POST : Forger et sédimenter un mot universel (Strictement Privé / Aura)
// -------------------------------------------------------------------------
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    // Validation stricte avec le schéma central
    const validationResult = LexiconEntrySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Un mot nécessite au moins un libellé, une phonétique IPA et un code de langue.", details: validationResult.error.flatten() }, 
        { status: 400 }
      );
    }

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    let result: { success?: boolean; mongo?: unknown };
    try {
      const orchestrator = new PoetrikOrchestrator();
      result = await orchestrator.fosterLexiconEntry(validationResult.data, signature);
    } catch (orchErr: any) {
      console.error("  [POETRIK ORCHESTRATOR POST ERROR] :", orchErr);
      const status = orchErr.statusCode || orchErr.status || 500;
      return NextResponse.json({ error: orchErr.message || "L'Îlot repousse ce mot." }, { status });
    }

    revalidateTag('poetrik-lexicon');
    revalidateTag(`lexicon-lang-${validationResult.data.languageCode}`);

    return NextResponse.json({
      success: true,
      message: "Entrée lexicale sédimentée avec succès dans l'Oracle.",
      data: result?.mongo
    }, { status: 201 });

  } catch (error: unknown) {
    return handleRouteError(error, 'POETRIK LEXICON POST GLOBAL ERROR');
  }
});