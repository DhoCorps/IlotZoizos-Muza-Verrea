export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { BarterOfferModel } from '@ilot/infrastructure';
import { EcommerceOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { slugify } from '@/lib/slugify';
import { unstable_cache, revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// 🧠 CACHE SÉCURISÉ : Récupération d'une offre par slug ou uid (30s)
async function getCachedBarterOffer(slug: string) {
  const fetcher = async () => {
    return await BarterOfferModel.findOne({ uid: slug }).lean();
  };

  if (process.env.NODE_ENV === 'test') return await fetcher();

  return await unstable_cache(
    fetcher,
    [`barter-${slug}`],
    { revalidate: 30, tags: ['barter-offers', `barter-${slug}`] }
  )();
}

// ==========================================
// 🔍 GET : Ausculter une offre (Public / Silice)
// ==========================================
export const GET = withSilice(async (_req: Request, context: ApiContext) => {
  try {
    const resolvedParams = await context.params;
    const slug = (resolvedParams as any)?.slug;
    
    if (!slug) return NextResponse.json({ error: "Identifiant d'offre invalide." }, { status: 400 });
    
    const barter = await getCachedBarterOffer(slugify(slug));
    if (!barter) return NextResponse.json({ error: "Offre introuvable." }, { status: 404 });
    
    return NextResponse.json(barter, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
});

// ==========================================
// ⚡ PATCH : Résoudre le troc (Strictement Privé / Aura)
// ==========================================
export const PATCH = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });

    const resolvedParams = await context.params;
    const slug = slugify((resolvedParams as any)?.slug || '');

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    const orchestrator = new EcommerceOrchestrator();
    const result = await orchestrator.resolveBarter({
      barterUid: slug,
      acceptorUid: currentUser.uid,
      status: body.status || (body.action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED')
    }, signature);

    // Invalidation
    revalidateTag('barter-offers');
    revalidateTag(`barter-${slug}`);

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Échec de résolution." }, { status: error.statusCode || 500 });
  }
});