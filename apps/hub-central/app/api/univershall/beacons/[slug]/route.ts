// app/api/univershall/beacons/[slug]/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { UniversHallBeaconModel } from '@ilot/infrastructure';
import { UniversHallOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// -------------------------------------------------------------------------
// GET : Ausculter une balise spécifique de l'Agora (Public / Silice)
// -------------------------------------------------------------------------
export const GET = withSilice(async (_req: NextRequest, context: ApiContext) => {
  try {
    let resolvedParams;
    try {
      resolvedParams = await context.params;
      if (resolvedParams instanceof Promise) {
        resolvedParams = await resolvedParams;
      }
    } catch {
      return NextResponse.json({ error: "Paramètres de route invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const slug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!slug) {
      return NextResponse.json({ error: "Identifiant de balise invalide." }, { status: 400 });
    }

    const beacon = await UniversHallBeaconModel.findOne({
      $or: [{ slug }, { uid: slug }]
    }).lean();

    if (!beacon) {
      return NextResponse.json({ error: "Balise introuvable sur l'Agora." }, { status: 404 });
    }

    const safeBeacon = JSON.parse(JSON.stringify(beacon));
    return NextResponse.json({ success: true, data: safeBeacon }, { status: 200 });

  } catch (error: any) {
    console.error("  [UNIVERS'HALL GET SLUG ERROR] :", error);
    return NextResponse.json({ error: error.message || "Erreur interne du serveur." }, { status: 500 });
  }
});

// -------------------------------------------------------------------------
// DELETE : Dissoudre / Retirer une balise de l'Agora (Strictement Privé / Aura)
// -------------------------------------------------------------------------
export const DELETE = withAura(async (_req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    let resolvedParams;
    try {
      resolvedParams = await context.params;
      if (resolvedParams instanceof Promise) {
        resolvedParams = await resolvedParams;
      }
    } catch {
      return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const slug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!slug) {
      return NextResponse.json({ error: "Identifiant de balise invalide." }, { status: 400 });
    }

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    try {
      const orchestrator = new UniversHallOrchestrator();
      await orchestrator.dissolveBeacon(slug, signature);
    } catch (orchErr: any) {
      console.error("  [UNIVERS'HALL ORCHESTRATOR DELETE ERROR] :", orchErr);
      const status = orchErr.statusCode || orchErr.status || 500;
      return NextResponse.json({ error: orchErr.message || "Échec de la dissolution de la balise." }, { status });
    }

    // Invalidation chirurgicale du cache en cascade
    revalidateTag('univershall-beacons');
    revalidateTag(`univershall-beacon-${slug}`);

    return NextResponse.json({
      success: true,
      message: "La balise a été dissoute et retirée de l'Agora."
    }, { status: 200 });

  } catch (error: any) {
    console.error("  [UNIVERS'HALL DELETE GLOBAL ERROR] :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
});