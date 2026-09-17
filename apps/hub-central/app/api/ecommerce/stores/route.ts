export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { StoreModel, OiseauModel } from '@ilot/infrastructure';
import { IOiseau, IStore } from '@ilot/types';
import { EcommerceOrchestrator } from '@ilot/shared-core';
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { getCachedVerifiedStores } from '@/lib/cache/ecommerce.cache';
import { StoreSchema } from '@ilot/types';

// ==========================================
// 💥 FONCTION DE CASCADE DES TAGS (CACHE)
// ==========================================
function revalidateStoreCascades(slug?: string, uid?: string, ownerUid?: string): void {
  revalidateTag('stores');
  revalidateTag('verified-stores');
  revalidateTag('ecommerce');
  if (slug) {
    revalidateTag(`store-${slug}`);
  }
  if (uid) {
    revalidateTag(`store-${uid}`);
  }
  if (ownerUid) {
    revalidateTag(`user-stores-${ownerUid}`);
  }
}

// ==========================================
// GET : Recenser toutes les boutiques vérifiées (Public / Silice)
// ==========================================
export const GET = withSilice(async (_req: NextRequest, _context: ApiContext) => {
  try {
    const stores = await getCachedVerifiedStores();
    return NextResponse.json(stores, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "Échec du recensement des boutiques.");
  }
});

// ==========================================
// POST : Création d'une boutique (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const ownerUid = currentUser.uid;

    // 🛡️ DOUANE VIBRATOIRE : Vérification du Tribunal de la Canopée
    const oiseauProfile = await OiseauModel.findOne({ uid: ownerUid }).lean() as IOiseau | null;
    if (oiseauProfile && (oiseauProfile.isBanned || oiseauProfile.profileStatus === 'INDESIRABLE')) {
      return NextResponse.json({ 
         success: false,
         error: "Souveraineté restreinte : Votre fréquence est jugée indésirable. La fondation de boutiques vous est interdite." 
      }, { status: 403 });
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Corps de requête illisible." }, { status: 400 });
    }

    // 🛡️ BLINDAGE MASS ASSIGNMENT : Validation stricte via StoreSchema
    const validation = StoreSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({ 
        success: false,
        error: "Contrat souverain invalide : Le format des données de la boutique est corrompu.", 
        details: validation.error.flatten() 
      }, { status: 400 });
    }

    const bodyData = validation.data;
    const storeUid = `store_${uuidv4()}`;
    
    // 1. Génération unique du Slug avec garde-fou anti-boucle
    const baseSlug = slugify(bodyData.storeName || 'boutique');
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
      ...bodyData,
      uid: storeUid,
      ownerUid,
      slug: finalSlug,
      isVerified: true
    }) as unknown as IStore;
    
    // 3. Synchronisation Neo4j (Non-bloquant)
    try {
      const orchestrator = new EcommerceOrchestrator();
      await orchestrator.createStore(
        { 
           uid: storeUid, 
           ownerUid, 
           storeName: bodyData.storeName, 
           slug: finalSlug, 
           stripeAccountId: bodyData.stripeAccountId 
        },
        { actorUid: ownerUid, capabilities: currentUser.capabilities || [] }
      );
    } catch (neoError) {
      console.error("  Fracture mineure Neo4j lors de la création de la boutique :", neoError);
    }
    
    // 💥 Invalidation chirurgicale du cache en cascade via notre helper dédié
    revalidateStoreCascades(finalSlug, storeUid, ownerUid);

    return NextResponse.json({
      success: true,
      message: "Boutique scellée avec succès dans l'îlot.",
      data: newStore
    }, { status: 201 });
  } catch (error: unknown) {
    return handleRouteError(error, "Échec lors de la création de la boutique.");
  }
});