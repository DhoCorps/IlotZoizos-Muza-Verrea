import { NextResponse } from 'next/server';
import { SujetModel } from '@ilot/infrastructure';
import { SujetOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { unstable_cache, revalidateTag } from 'next/cache';
import { withAura, withOptionalAura, OiseauUser, ApiContext } from '@/lib/api-guards';

export const dynamic = 'force-dynamic';

// 🧠 CACHE : Récupération des sujets (Bibliothèque)
const getCachedSujets = (userUid?: string, category?: string) => {
  return unstable_cache(
    async () => {
      let queryFilter: any = {
        $or: [{ status: 'PUBLISHED' }]
      };

      if (userUid) {
        queryFilter.$or.push({ authorUid: userUid });
      }

      if (category) {
        queryFilter.category = category;
      }

      return await SujetModel.find(queryFilter)
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
    },
    [`sujets-list-${userUid || 'public'}-${category || 'all'}`],
    { revalidate: 60, tags: ['sujets', `sujets-user-${userUid || 'public'}`] }
  )();
};

// ==========================================
// 🔍 GET : La Bibliothèque (Lister les sujets - Public / Optionnel Aura)
// ==========================================
export const GET = withOptionalAura(async (req: Request, _context: ApiContext, currentUser?: OiseauUser) => {
  try {
    let url;
    try {
      url = new URL(req.url);
    } catch (err) {
      return NextResponse.json({ error: "URL de requête invalide." }, { status: 400 });
    }

    const filterCategory = url.searchParams.get('category') || undefined;
    const userUid = currentUser?.uid;

    const sujets = await getCachedSujets(userUid, filterCategory);

    return NextResponse.json(sujets, { status: 200 });

  } catch (error: any) {
    console.error("🌊 Erreur globale dans la Bibliothèque (GET Sujets):", error);
    return NextResponse.json({ error: "Erreur interne globale." }, { status: 500 });
  }
});

// ==========================================
// 🚀 POST : Fondation d'un Nœud de Pensée (Strictement Privé)
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
      return NextResponse.json({ error: "Un Sujet nécessite un nom et une substance (contenu)." }, { status: 400 });
    }

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    let result;
    try {
      const sujetOrch = new SujetOrchestrator();
      const dataToForge = { ...body, authorUid: currentUser.uid };
      result = await sujetOrch.fosterSujet(dataToForge, signature);
    } catch (orchErr: any) {
      console.error("🌋 [NEXUS SUJET ORCHESTRATOR ERROR] :", orchErr);
      const status = orchErr.statusCode || 500;
      return NextResponse.json({ error: orchErr.message || "L'Îlot repousse ce fragment de pensée." }, { status });
    }
    
    // 💥 BOOM ! Invalidation chirurgicale du cache de la bibliothèque
    revalidateTag('sujets');
    revalidateTag(`sujets-user-${currentUser.uid}`);
    revalidateTag(`sujets-user-public`);

    return NextResponse.json(result, { status: 201 });

  } catch (error: any) {
    console.error("🔥 Erreur globale POST Sujet :", error);
    return NextResponse.json({ error: "Erreur interne globale." }, { status: 500 });
  }
});