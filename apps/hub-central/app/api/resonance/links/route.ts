export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { ResonanceOrchestrator } from '@ilot/shared-core';
import { WeaveLinkSchema, ActionSignature, EntityLabel, ResonanceType } from '@ilot/types';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

/**
 * 🕸️ POST : Tissage d'un pont transdisciplinaire de résonance dans le Graphe
 */
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let rawBody;
    try {
      rawBody = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "Le chant (requête) est illisible." }, { status: 400 });
    }

    const validation = WeaveLinkSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Lien malformé.", details: validation.error.flatten() }, 
        { status: 400 }
      );
    }

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    let result;
    try {
      // 🕸️ APPEL STATIQUE DIRECT (Tissage de la résonance inter-domaines)
      result = await ResonanceOrchestrator.weaveCrossDomainLink(
        validation.data.sourceUid,
        validation.data.sourceLabel as EntityLabel,
        validation.data.targetUid,
        validation.data.targetLabel as EntityLabel,
        validation.data.relationType as ResonanceType,
        signature
      );
    } catch (neoErr: any) {
      console.error("🌋 [NEO4J WEAVE FORGE ERROR] :", neoErr);
      const status = neoErr.status || neoErr.statusCode || 500;
      return NextResponse.json({ error: neoErr.message || "Le Graphe a rejeté le tissage." }, { status });
    }

    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade
    // On purge le tag global des liens et les tags spécifiques des deux entités reliées
    revalidateTag('resonance-links');
    revalidateTag(`entity-${validation.data.sourceUid}`);
    revalidateTag(`entity-${validation.data.targetUid}`);

    return NextResponse.json({
      success: true,
      message: `Pont transdisciplinaire [${validation.data.relationType}] forgé avec succès dans le Graphe !`,
      data: result
    }, { status: 201 });

  } catch (error: any) {
    console.error("🌋 Fracture globale lors du tissage de liens :", error);
    return NextResponse.json({ error: error.message || "La tempête a brisé le pont." }, { status: 500 });
  }
});