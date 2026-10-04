// apps/hub-central/app/api/poetrik/poems/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { PoemModel } from '@ilot/infrastructure';
import { PoetrikOrchestrator } from '@ilot/shared-core';
import { PoemSchema } from '@ilot/types';
import { revalidateTag } from 'next/cache';
import { withAura, withOptionalAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';

// -------------------------------------------------------------------------
// ⛲ GET : La Fontaine des Vers (Flux public)
// -------------------------------------------------------------------------
export const GET = withOptionalAura(async (req: NextRequest, _context: ApiContext, _currentUser?: OiseauUser) => {
  try {
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);
    const authorUid = url.searchParams.get('authorUid');

    const query: Record<string, any> = {
      status: 'PUBLISHED',
      visibility: 'PUBLIC'
    };

    if (authorUid) {
      query.authorUid = authorUid;
    }

    const poems = await PoemModel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Sécurisation du format de sortie
    const safePoems = JSON.parse(JSON.stringify(poems || []));

    return NextResponse.json({ success: true, data: safePoems }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, 'POETRIK GET POEMS ERROR');
  }
});

// -------------------------------------------------------------------------
// 🪶 POST : Sceller et sédimenter un Poème (Sceau & Graphe)
// -------------------------------------------------------------------------
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Le parchemin est indéchiffrable (JSON invalide)." }, { status: 400 });
    }

    // 1. Force l'attribution du poème à l'Oiseau connecté
    const payload = { ...body, authorUid: currentUser.uid };

    // 2. Validation stricte du format avant de déranger l'Orchestrateur
    const validationResult = PoemSchema.safeParse(payload);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "L'encre bave. Le format du poème est invalide.", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const signature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    // 3. Appel de l'Alchimie (Orchestrateur Poetrik)
    const orchestrator = new PoetrikOrchestrator();
    let result;
    
    try {
      result = await orchestrator.sealPoem(validationResult.data, signature);
    } catch (orchErr: any) {
      const status = orchErr.statusCode || orchErr.status || 500;
      return NextResponse.json({ error: orchErr.message || "L'Îlot refuse ce chant." }, { status });
    }

    // 4. Actualisation des caches de la Canopée
    revalidateTag('poetrik-poems');
    if (validationResult.data.authorUid) {
      revalidateTag(`poetrik-author-${validationResult.data.authorUid}`);
    }

    return NextResponse.json({
      success: true,
      message: "Poème sédimenté, Sceau cryptographique forgé et récompenses attribuées.",
      data: result
    }, { status: 201 });

  } catch (error: unknown) {
    return handleRouteError(error, 'POETRIK POST POEM ERROR');
  }
});