export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { PartitaModel } from '@ilot/infrastructure';
import { PartitaOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { unstable_cache, revalidateTag } from 'next/cache';
import { withAura, withOptionalAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// 🧠 CACHE : Récupération optimisée du catalogue des partitions
const getCachedPartitas = (userUid?: string, filterInstrument?: string | null, filterStatus?: string | null) => {
  return unstable_cache(
    async () => {
      let queryFilter: any = {
        $or: [
          { status: 'PUBLISHED' } // Les partitions publiées sont visibles par tous
        ]
      };

      if (userUid) {
        queryFilter.$or.push({ authorUid: userUid });
      }

      if (filterInstrument) queryFilter.instrument = filterInstrument;
      if (filterStatus) queryFilter.status = filterStatus;

      return await PartitaModel.find(queryFilter)
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
    },
    [`partitas-list-${userUid || 'public'}-${filterInstrument || 'all'}-${filterStatus || 'all'}`],
    { revalidate: 60, tags: ['partitas', `partitas-user-${userUid || 'public'}`] }
  )();
};

// ==========================================
// 🔍 GET : Le Catalogue des Partitions (Public / Optionnel Aura)
// ==========================================
export const GET = withOptionalAura(async (req: Request, _context: ApiContext, currentUser?: OiseauUser) => {
  try {
    let url;
    try {
      url = new URL(req.url);
    } catch (urlErr) {
      return NextResponse.json({ error: "URL de requête invalide." }, { status: 400 });
    }

    const filterInstrument = url.searchParams.get('instrument');
    const filterStatus = url.searchParams.get('status');
    const userUid = currentUser?.uid;

    const partitions = await getCachedPartitas(userUid, filterInstrument, filterStatus);

    return NextResponse.json(partitions, { status: 200 });

  } catch (error: any) {
    console.error("🌊 Erreur globale GET Partitions:", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
});

// ==========================================
// 🚀 POST : Fondation d'une Partition (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    if (!body.title || !body.content) {
      return NextResponse.json({ error: "Une partition nécessite un titre et une substance (contenu)." }, { status: 400 });
    }

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    let result;
    try {
      const partitaOrch = new PartitaOrchestrator();
      const dataToForge = { ...body, authorUid: currentUser.uid };
      result = await partitaOrch.fosterPartita(dataToForge, signature);
    } catch (orchErr: any) {
      console.error("🌋 [PARTITA ORCHESTRATOR POST ERROR] :", orchErr);
      const status = orchErr.statusCode || orchErr.status || 500;
      return NextResponse.json({ error: orchErr.message || "L'Îlot repousse cette partition." }, { status });
    }
    
    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade
    revalidateTag('partitas');
    revalidateTag(`partitas-user-${currentUser.uid}`);
    revalidateTag(`partitas-user-public`);

    return NextResponse.json(result, { status: 201 });

  } catch (error: any) {
    console.error("🔥 Erreur globale POST Partitions :", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
});