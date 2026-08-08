export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { BarterOfferModel } from '@ilot/infrastructure';
import { EcommerceOrchestrator } from '@ilot/shared-core';
import { v4 as uuidv4 } from 'uuid';
import { unstable_cache, revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// 🧠 CACHE SÉCURISÉ : Recensement des offres de troc en attente (30s) avec bypass en mode test
async function getCachedPendingBarters() {
  const fetcher = async () => {
    return await BarterOfferModel.find({ status: 'PENDING' }).sort({ createdAt: -1 }).lean();
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  return await unstable_cache(
    fetcher,
    ['pending-barter-offers'],
    { revalidate: 30, tags: ['barter-offers', 'pending-barters'] }
  )();
}

// ==========================================
// 🔍 GET : Recenser les offres de troc en attente (Public / Silice)
// ==========================================
export const GET = withSilice(async (_req: Request, _context: ApiContext) => {
  try {
    const offers = await getCachedPendingBarters();
    return NextResponse.json(offers, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur lors du recensement des offres de troc :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
});

// ==========================================
// 🚀 POST : Proposer un troc (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    const initiatorUid = currentUser.uid || currentUser.id;
    const barterUid = `barter_${uuidv4()}`;

    const newOffer = await BarterOfferModel.create({
      ...body,
      uid: barterUid,
      initiatorUid,
      status: 'PENDING'
    });

    try {
      const orchestrator = new EcommerceOrchestrator();
      await orchestrator.proposeBarter(
        { 
          uid: barterUid, 
          initiatorUid, 
          receiverUid: body.receiverUid, 
          offeredUids: body.offeredProductUids, 
          requestedUids: body.requestedProductUids 
        },
        { actorUid: initiatorUid, capabilities: currentUser.capabilities || [] }
      );
    } catch (orchErr) {
      console.error("🔥 [ECOMMERCE ORCHESTRATOR PROPOSE ERROR]", orchErr);
    }

    // 💥 Invalidation chirurgicale du cache en cascade
    revalidateTag('barter-offers');
    revalidateTag('pending-barters');
    revalidateTag(`user-barters-${initiatorUid}`);

    return NextResponse.json({ success: true, data: newOffer }, { status: 201 });

  } catch (error: any) {
    console.error("🔥 Erreur lors de la proposition de troc :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
});

// ==========================================
// ⚡ PATCH : Résoudre / Mettre à jour une offre de troc (Strictement Privé / Aura)
// ==========================================
export const PATCH = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    const { barterUid, status } = body; 
    const acceptorUid = currentUser.uid || currentUser.id;

    if (!barterUid || !status) {
      return NextResponse.json({ error: "Identifiant de troc ou statut manquant." }, { status: 400 });
    }

    const updated = await BarterOfferModel.findOneAndUpdate(
      { uid: barterUid },
      { $set: { status } },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Offre de troc introuvable." }, { status: 404 });
    }

    try {
      const orchestrator = new EcommerceOrchestrator();
      await orchestrator.resolveBarter(
        { barterUid, acceptorUid, status },
        { actorUid: acceptorUid, capabilities: currentUser.capabilities || [] }
      );
    } catch (orchErr) {
      console.error("🔥 [ECOMMERCE ORCHESTRATOR RESOLVE MAIN ERROR]", orchErr);
    }

    // 💥 Invalidation chirurgicale du cache en cascade
    revalidateTag('barter-offers');
    revalidateTag('pending-barters');
    revalidateTag(`barter-${barterUid}`);

    return NextResponse.json({ success: true, data: updated }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur lors de la résolution du troc :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
});