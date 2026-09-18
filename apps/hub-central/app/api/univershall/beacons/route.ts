export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { UniversHallBeaconModel } from '@ilot/infrastructure';
import { UniversHallOrchestrator, PlantBeaconPayload, UniversHallSyncResult } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';

// -------------------------------------------------------------------------
// GET : Recenser et filtrer les balises de l'Agora (Public / Silice)
// -------------------------------------------------------------------------
export const GET = withSilice(async (req: NextRequest, _context: ApiContext) => {
  try {
    let url: URL;
    try {
      url = new URL(req.url);
    } catch {
      return NextResponse.json({ success: false, error: "URL de requête invalide." }, { status: 400 });
    }

    const module = url.searchParams.get('module');
    const tag = url.searchParams.get('tag');
    const search = url.searchParams.get('search');

    const query: Record<string, unknown> = {};
    if (module && module !== 'ALL') {
      query.sourceModule = module.toUpperCase();
    }
    if (tag) {
      query.tags = tag;
    }
    if (search) {
      query.$text = {$search: search };
    }

    const beacons = await UniversHallBeaconModel.find(query)
      .sort({ resonanceScore: -1, createdAt: -1 })
      .limit(50)
      .lean();

    const safeBeacons = JSON.parse(JSON.stringify(beacons || []));

    return NextResponse.json({ success: true, data: safeBeacons }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "UNIVERSHALL BEACONS GET FATAL ERROR");
  }
});

// -------------------------------------------------------------------------
// POST : Planter une nouvelle balise sur l'Agora (Strictement Privé / Aura)
// -------------------------------------------------------------------------
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let body: { title?: string; entityUid?: string; sourceModule?: string; [key: string]: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Corps de requête illisible." }, { status: 400 });
    }

    if (!body?.title || !body?.entityUid || !body?.sourceModule) {
      return NextResponse.json(
        { success: false, error: "Une balise nécessite un titre, un module source et un identifiant d'entité." },
        { status: 400 }
      );
    }

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    let result: UniversHallSyncResult;
    try {
      const orchestrator = new UniversHallOrchestrator();
      result = await orchestrator.plantBeacon({
        ...body,
        sourceModule: body.sourceModule as PlantBeaconPayload['sourceModule'],
        entityUid: body.entityUid as string,
        title: body.title as string,
      }, signature);
    } catch (orchErr: unknown) {
      const err = orchErr as { status?: number; statusCode?: number; message?: string };
      console.error("  [UNIVERS'HALL ORCHESTRATOR ERROR] :", err);
      const status = err.statusCode || err.status || 500;
      return NextResponse.json({ success: false, error: err.message || "L'Îlot repousse cette balise." }, { status });
    }

    // Invalidation chirurgicale du cache de l'Agora
    revalidateTag('univershall-beacons');
    revalidateTag(`univershall-module-${body.sourceModule}`);

    return NextResponse.json({
      success: true,
      message: "Balise plantée avec succès sur l'Agora d'Univers'Hall !",
      data: result.mongo
    }, { status: 201 });

  } catch (error: unknown) {
    return handleRouteError(error, "UNIVERSHALL BEACONS POST FATAL ERROR");
  }
});