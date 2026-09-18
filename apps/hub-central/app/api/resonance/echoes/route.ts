export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { ResonanceModel } from '@ilot/infrastructure';
import { ResonanceOrchestrator } from '@ilot/shared-core';
import { EchoSchema, ActionSignature, EntityLabel } from '@ilot/types';
import { unstable_cache, revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';

// 🧠 CACHE : Récupération des échos pour une cible donnée
const getCachedEchoes = (targetUid: string) => {
  return unstable_cache(
    async () => {
      return await ResonanceModel.find({ targetUid })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
    },
    [`resonance-echoes-${targetUid}`],
    { revalidate: 60, tags: ['resonance-echoes', `echoes-${targetUid}`] }
  )();
};

// ==========================================
// 🔍 GET : Écouter les résonances (Échos - Public / Silice)
// ==========================================
export const GET = withSilice(async (req: NextRequest, _context: ApiContext) => {
  try {
    let url: URL;
    try {
      url = new URL(req.url);
    } catch {
      return NextResponse.json({ error: "URL de requête invalide." }, { status: 400 });
    }

    const targetUid = url.searchParams.get('targetUid');
    if (!targetUid) {
      return NextResponse.json({ error: "Cible de résonance manquante." }, { status: 400 });
    }

    const echoes = await getCachedEchoes(targetUid);

    return NextResponse.json(echoes, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, 'RESONANCE ECHOES GET ERROR');
  }
});

// ==========================================
// 🚀 POST : Propager un Écho (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: "Le chant (requête) est illisible." }, { status: 400 });
    }

    const validation = EchoSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Écho malformé.", details: validation.error.flatten() }, 
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    let resonanceResult: Awaited<ReturnType<typeof ResonanceOrchestrator.addSocialEcho>>;
    try {
      // 🕸️ 1. Inscription dans le Graphe Neo4j
      resonanceResult = await ResonanceOrchestrator.addSocialEcho(
        validatedData.targetUid,
        validatedData.targetLabel as EntityLabel,
        validatedData.echoType,
        validatedData.content,
        signature
      );
    } catch (neoErr: unknown) {
      const err = neoErr as { status?: number; statusCode?: number; message?: string };
      console.error("🌋 [NEO4J ECHO FORGE ERROR] :", err);
      const status = err.statusCode || err.status || 500;
      return NextResponse.json({ error: err.message || "Le Graphe a rejeté l'écho." }, { status });
    }

    // 2. Sédimentation pérenne dans la Silice MongoDB pour les échos textuels
    let savedEcho: unknown = null;
    if (validatedData.echoType === 'TEXT') {
      try {
        const createResult = await ResonanceModel.create([{
          uid: resonanceResult.echoUid,
          targetUid: validatedData.targetUid,
          targetLabel: validatedData.targetLabel,
          actorUid: currentUser.uid,
          echoType: validatedData.echoType,
          content: validatedData.content
        }]);
        savedEcho = createResult[0];
      } catch (mongoErr) {
        console.error("🔥 [MONGO ECHO SEDIMENTATION ERROR] :", mongoErr);
        
        // 💥 BOOM ! Invalidation chirurgicale du cache même en cas de repli partiel
        revalidateTag('resonance-echoes');
        revalidateTag(`echoes-${validatedData.targetUid}`);
        revalidateTag(`entity-${validatedData.targetUid}`);

        return NextResponse.json({ 
          success: true, 
          warning: "Écho inscrit dans le Graphe, mais la Silice n'a pas pu le retenir.",
          echo: resonanceResult 
        }, { status: 201 });
      }
    }

    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade
    revalidateTag('resonance-echoes');
    revalidateTag(`echoes-${validatedData.targetUid}`);
    revalidateTag(`entity-${validatedData.targetUid}`);

    return NextResponse.json({
      success: true,
      message: "L'écho s'est propagé à travers toute l'Îlot.",
      echo: savedEcho || resonanceResult
    }, { status: 201 });

  } catch (error: unknown) {
    return handleRouteError(error, 'RESONANCE ECHOES POST ERROR');
  }
});