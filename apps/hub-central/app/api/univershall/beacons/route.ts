// app/api/univershall/beacons/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { UniversHallBeaconModel } from '@ilot/infrastructure';
import { UniversHallOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// -------------------------------------------------------------------------
// GET : Recenser et filtrer les balises de l'Agora (Public / Silice)
// -------------------------------------------------------------------------
export const GET = withSilice(async (req: NextRequest, _context: ApiContext) => {
  try {
    const url = new URL(req.url);
    const module = url.searchParams.get('module');
    const tag = url.searchParams.get('tag');
    const search = url.searchParams.get('search');

    const query: any = {};
    if (module && module !== 'ALL') {
      query.sourceModule = module.toUpperCase();
    }
    if (tag) {
      query.tags = tag;
    }
    if (search) {
      query.$text = { $search: search };
    }

    const beacons = await UniversHallBeaconModel.find(query)
      .sort({ resonanceScore: -1, createdAt: -1 })
      .limit(50)
      .lean();

    const safeBeacons = JSON.parse(JSON.stringify(beacons || []));

    return NextResponse.json({ success: true, data: safeBeacons }, { status: 200 });
  } catch (error: any) {
    console.error("  [UNIVERS'HALL GET ERROR] :", error);
    return NextResponse.json({ error: error.message || "Erreur interne lors de la lecture de l'Agora." }, { status: 500 });
  }
});

// -------------------------------------------------------------------------
// POST : Planter une nouvelle balise sur l'Agora (Strictement Privé / Aura)
// -------------------------------------------------------------------------
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    if (!body.title || !body.entityUid || !body.sourceModule) {
      return NextResponse.json(
        { error: "Une balise nécessite un titre, un module source et un identifiant d'entité." },
        { status: 400 }
      );
    }

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    let result;
    try {
      const orchestrator = new UniversHallOrchestrator();
      result = await orchestrator.plantBeacon(body, signature);
    } catch (orchErr: any) {
      console.error("  [UNIVERS'HALL ORCHESTRATOR ERROR] :", orchErr);
      const status = orchErr.statusCode || orchErr.status || 500;
      return NextResponse.json({ error: orchErr.message || "L'Îlot repousse cette balise." }, { status });
    }

    // Invalidation chirurgicale du cache de l'Agora
    revalidateTag('univershall-beacons');
    revalidateTag(`univershall-module-${body.sourceModule}`);

    return NextResponse.json({
      success: true,
      message: "Balise plantée avec succès sur l'Agora d'Univers'Hall !",
      data: result.mongo
    }, { status: 201 });

  } catch (error: any) {
    console.error("  [UNIVERS'HALL POST GLOBAL ERROR] :", error);
    return NextResponse.json({ error: error.message || "Erreur interne du serveur." }, { status: 500 });
  }
});