export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { LexiconEntryModel } from '@ilot/infrastructure';
import { PoetrikOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { revalidateTag } from 'next/cache';
import { withAura, withOptionalAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

// 🛡️ Schéma de validation Zod pour l'entrée lexicale Poetrik
const LexiconEntrySchema = z.object({
  uid: z.string().optional(),
  languageCode: z.string().min(1, "Le code de langue est requis."),
  word: z.string().min(1, "Le mot est requis."),
  phoneticIpa: z.string().min(1, "La phonétique IPA est requise."),
  syllableCount: z.number().int().positive().optional().default(1),
  definitions: z.record(z.string(), z.string()).optional().default({}),
  partOfSpeech: z.string().optional().default('noun'),
  rhymesWith: z.array(z.object({
    targetUid: z.string(),
    type: z.string(),
    match: z.string(),
  })).optional(),
  translations: z.array(z.object({
    targetUid: z.string(),
    lang: z.string(),
  })).optional(),
});

type LexiconEntryInput = z.infer<typeof LexiconEntrySchema>;

// -------------------------------------------------------------------------
// GET : Recenser ou rechercher des mots dans l'Oracle Lexical
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
      query.word = { $regex: new RegExp(search, 'i') };
    }

    const entries = await LexiconEntryModel.find(query).limit(50).lean();
    const safeEntries = JSON.parse(JSON.stringify(entries || []));

    return NextResponse.json({ success: true, data: safeEntries }, { status: 200 });
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

    const validationResult = LexiconEntrySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Un mot nécessite au moins un libellé, une phonétique IPA et un code de langue.", details: validationResult.error.flatten() }, 
        { status: 400 }
      );
    }

    const validatedData: LexiconEntryInput = validationResult.data;

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    let result: { success?: boolean; mongo?: unknown };
    try {
      const orchestrator = new PoetrikOrchestrator();
      result = await orchestrator.fosterLexiconEntry(validatedData, signature);
    } catch (orchErr: unknown) {
      const err = orchErr as { statusCode?: number; status?: number; message?: string };
      console.error("  [POETRIK ORCHESTRATOR POST ERROR] :", err);
      const status = err.statusCode || err.status || 500;
      return NextResponse.json({ error: err.message || "L'Îlot repousse ce mot." }, { status });
    }

    revalidateTag('poetrik-lexicon');
    revalidateTag(`lexicon-lang-${validatedData.languageCode}`);

    return NextResponse.json({
      success: true,
      message: "Entrée lexicale sédimentée avec succès dans l'Oracle.",
      data: result?.mongo
    }, { status: 201 });

  } catch (error: unknown) {
    return handleRouteError(error, 'POETRIK LEXICON POST GLOBAL ERROR');
  }
});