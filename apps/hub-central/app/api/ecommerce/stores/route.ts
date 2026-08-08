export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { StoreModel } from '@ilot/infrastructure';
import { EcommerceOrchestrator } from '@ilot/shared-core';
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '@/lib/slugify';
import { unstable_cache, revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// 🧠 CACHE SÉCURISÉ : Recensement des boutiques vérifiées mis en cache (30s) avec bypass en mode test
async function getCachedVerifiedStores() {
  const fetcher = async () => {
    return await StoreModel.find({ isVerified: true }).sort({ createdAt: -1 }).lean();
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  return await unstable_cache(
    fetcher,
    ['verified-stores-cache'],
    { revalidate: 30, tags: ['stores', 'verified-stores'] }
  )();
}

// ==========================================
// 🔍 GET : Recenser toutes les boutiques vérifiées (Public / Silice)
// ==========================================
export const GET = withSilice(async (_req: Request, _context: ApiContext) => {
  try {
    const stores = await getCachedVerifiedStores();
    return NextResponse.json(stores, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur lors du recensement des boutiques :", error);
    return NextResponse.json({ error: error.message || "Échec du recensement." }, { status: 500 });
  }
});

// ==========================================
// 🚀 POST : Création d'une boutique (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    const ownerUid = currentUser.uid;
    const storeUid = `store_${uuidv4()}`;

    // 1. Génération unique du Slug avec garde-fou anti-boucle
    const baseSlug = slugify(body.storeName || 'boutique');
    let finalSlug = baseSlug;
    
    let slugExists = await StoreModel.findOne({ slug: finalSlug }).lean();
    let counter = 1;
    let safetyCounter = 0;

    while (slugExists && safetyCounter < 50) {
      finalSlug = `${baseSlug}-${counter}`;
      slugExists = await StoreModel.findOne({ slug: finalSlug }).lean();
      counter++;
      safetyCounter++;
    }

    // 2. Enregistrement dans MongoDB
    const newStore = await StoreModel.create({
      ...body,
      uid: storeUid,
      ownerUid,
      slug: finalSlug,
      isVerified: true
    });

    // 3. Synchronisation Neo4j (Non-bloquant)
    try {
      const orchestrator = new EcommerceOrchestrator();
      await orchestrator.createStore(
        { 
          uid: storeUid, 
          ownerUid, 
          storeName: body.storeName, 
          slug: finalSlug, 
          stripeAccountId: body.stripeAccountId 
        },
        { actorUid: ownerUid, capabilities: currentUser.capabilities || [] }
      );
    } catch (neoError) {
      console.error("⚠️ Fracture mineure Neo4j lors de la création de la boutique :", neoError);
    }

    // 💥 Invalidation chirurgicale du cache en cascade
    revalidateTag('stores');
    revalidateTag('verified-stores');

    return NextResponse.json({
      success: true,
      message: "Boutique scellée avec succès dans l'Îlot.",
      data: newStore
    }, { status: 201 });

  } catch (error: any) {
    console.error("🔥 Fracture lors de la création de la boutique :", error);
    return NextResponse.json({ error: error.message || "Échec de la création." }, { status: 500 });
  }
});