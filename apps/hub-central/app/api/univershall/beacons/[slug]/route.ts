export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { UniversHallBeaconModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { UniversHallOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';

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
      return NextResponse.json({ success: false, error: "Paramètres de route invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ success: false, error: "Identifiant de balise invalide." }, { status: 400 });
    }

    // 🔍 Résolution unifiée de la balise via notre helper centralisé
    const beacon = (await findEntityBySlugOrUid(UniversHallBeaconModel, identifier)) as { uid?: string; slug?: string; [key: string]: unknown } | null;

    if (!beacon) {
      return NextResponse.json({ success: false, error: "Balise introuvable sur l'Agora." }, { status: 404 });
    }

    const safeBeacon = JSON.parse(JSON.stringify(beacon));
    return NextResponse.json({ success: true, data: safeBeacon }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, "UNIVERSHALL GET SLUG FATAL ERROR");
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
      return NextResponse.json({ success: false, error: "Paramètres invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ success: false, error: "Identifiant de balise invalide." }, { status: 400 });
    }

    // 🔍 Résolution unifiée pour cibler proprement la balise avant dissolution
    const targetBeacon = (await findEntityBySlugOrUid(UniversHallBeaconModel, identifier)) as { uid?: string; slug?: string; [key: string]: unknown } | null;
    if (!targetBeacon) {
      return NextResponse.json({ success: false, error: "Balise introuvable sur l'Agora." }, { status: 404 });
    }

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    try {
      const orchestrator = new UniversHallOrchestrator();
      // On passe l'UID canonique à l'orchestrateur
      await orchestrator.dissolveBeacon(targetBeacon.uid || identifier, signature);
    } catch (orchErr: unknown) {
      const err = orchErr as { status?: number; statusCode?: number; message?: string };
      console.error("  [UNIVERS'HALL ORCHESTRATOR DELETE ERROR] :", err);
      const status = err.statusCode || err.status || 500;
      return NextResponse.json({ success: false, error: err.message || "Échec de la dissolution de la balise." }, { status });
    }

    // 💥 Invalidation chirurgicale du cache en cascade
    revalidateTag('univershall-beacons');
    revalidateTag(`univershall-beacon-${identifier}`);
    if (targetBeacon.slug) revalidateTag(`univershall-beacon-${targetBeacon.slug}`);
    if (targetBeacon.uid) revalidateTag(`univershall-beacon-${targetBeacon.uid}`);

    return NextResponse.json({
      success: true,
      message: "La balise a été dissoute et retirée de l'Agora."
    }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, "UNIVERSHALL DELETE FATAL ERROR");
  }
});