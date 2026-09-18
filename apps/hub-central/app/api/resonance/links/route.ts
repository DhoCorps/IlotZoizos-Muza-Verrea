export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { ResonanceOrchestrator } from '@ilot/shared-core';
import { WeaveLinkSchema, ActionSignature, EntityLabel, ResonanceType } from '@ilot/types';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';

/**
 * 🕸️ POST : Tissage d'un pont transdisciplinaire de résonance dans le Graphe
 */
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: "Le chant (requête) est illisible." }, { status: 400 });
    }

    const validation = WeaveLinkSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Lien malformé.", details: validation.error.flatten() }, 
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    let result: unknown;
    try {
      // 🕸️ APPEL STATIQUE DIRECT (Tissage de la résonance inter-domaines)
      result = await ResonanceOrchestrator.weaveCrossDomainLink(
        validatedData.sourceUid,
        validatedData.sourceLabel as EntityLabel,
        validatedData.targetUid,
        validatedData.targetLabel as EntityLabel,
        validatedData.relationType as ResonanceType,
        signature
      );
    } catch (neoErr: unknown) {
      const err = neoErr as { status?: number; statusCode?: number; message?: string };
      console.error("🌋 [NEO4J WEAVE FORGE ERROR] :", err);
      const status = err.status || err.statusCode || 500;
      return NextResponse.json({ error: err.message || "Le Graphe a rejeté le tissage." }, { status });
    }

    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade
    // On purge le tag global des liens et les tags spécifiques des deux entités reliées
    revalidateTag('resonance-links');
    revalidateTag(`entity-${validatedData.sourceUid}`);
    revalidateTag(`entity-${validatedData.targetUid}`);

    return NextResponse.json({
      success: true,
      message: `Pont transdisciplinaire [${validatedData.relationType}] forgé avec succès dans le Graphe !`,
      data: result
    }, { status: 201 });

  } catch (error: unknown) {
    return handleRouteError(error, 'RESONANCE LINKS POST ERROR');
  }
});