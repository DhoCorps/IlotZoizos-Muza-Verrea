export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ResonanceModel } from '@ilot/infrastructure';
import { ResonanceOrchestrator } from '@ilot/shared-core';
import { EchoSchema, ActionSignature, EntityLabel } from '@ilot/types';
import { unstable_cache, revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

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
export const GET = withSilice(async (req: Request, _context: ApiContext) => {
  try {
    let url;
    try {
      url = new URL(req.url);
    } catch (err) {
      return NextResponse.json({ error: "URL de requête invalide." }, { status: 400 });
    }

    const targetUid = url.searchParams.get('targetUid');
    if (!targetUid) {
      return NextResponse.json({ error: "Cible de résonance manquante." }, { status: 400 });
    }

    const echoes = await getCachedEchoes(targetUid);

    return NextResponse.json(echoes, { status: 200 });

  } catch (error: any) {
    console.error("🌊 Erreur globale lors de la lecture des échos :", error);
    return NextResponse.json({ error: "La tempête a brouillé l'écoute." }, { status: 500 });
  }
});

// ==========================================
// 🚀 POST : Propager un Écho (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let rawBody;
    try {
      rawBody = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "Le chant (requête) est illisible." }, { status: 400 });
    }

    const validation = EchoSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Écho malformé.", details: validation.error.flatten() }, 
        { status: 400 }
      );
    }

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    let resonanceResult;
    try {
      // 🕸️ 1. Inscription dans le Graphe Neo4j
      resonanceResult = await ResonanceOrchestrator.addSocialEcho(
        validation.data.targetUid,
        validation.data.targetLabel as EntityLabel,
        validation.data.echoType,
        validation.data.content,
        signature
      );
    } catch (neoErr: any) {
      console.error("🌋 [NEO4J ECHO FORGE ERROR] :", neoErr);
      const status = neoErr.statusCode || neoErr.status || 500;
      return NextResponse.json({ error: neoErr.message || "Le Graphe a rejeté l'écho." }, { status });
    }

    // 2. Sédimentation pérenne dans la Silice MongoDB pour les échos textuels
    let savedEcho = null;
    if (validation.data.echoType === 'TEXT') {
      try {
        const createResult = await ResonanceModel.create([{
          uid: resonanceResult.echoUid,
          targetUid: validation.data.targetUid,
          targetLabel: validation.data.targetLabel,
          actorUid: currentUser.uid,
          echoType: validation.data.echoType,
          content: validation.data.content
        }]);
        savedEcho = createResult[0];
      } catch (mongoErr) {
        console.error("🔥 [MONGO ECHO SEDIMENTATION ERROR] :", mongoErr);
        
        // 💥 BOOM ! Invalidation chirurgicale du cache même en cas de repli partiel
        revalidateTag('resonance-echoes');
        revalidateTag(`echoes-${validation.data.targetUid}`);
        revalidateTag(`entity-${validation.data.targetUid}`);

        return NextResponse.json({ 
          success: true, 
          warning: "Écho inscrit dans le Graphe, mais la Silice n'a pas pu le retenir.",
          echo: resonanceResult 
        }, { status: 201 });
      }
    }

    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade
    revalidateTag('resonance-echoes');
    revalidateTag(`echoes-${validation.data.targetUid}`);
    revalidateTag(`entity-${validation.data.targetUid}`);

    return NextResponse.json({
      success: true,
      message: "L'écho s'est propagé à travers toute l'Îlot.",
      echo: savedEcho || resonanceResult
    }, { status: 201 });

  } catch (error: any) {
    console.error("🌋 Fracture globale lors de la sédimentation de l'écho :", error);
    return NextResponse.json({ error: "La tempête a étouffé le murmure." }, { status: 500 });
  }
});