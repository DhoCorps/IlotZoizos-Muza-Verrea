export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { BarterOfferModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { EcommerceOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// ==========================================
// GET : Ausculter une offre (Public / Silice)
// ==========================================
export const GET = withSilice(async (_req: Request, context: ApiContext) => {
  try {
    const resolvedParams = await context.params;
    const rawSlug = (resolvedParams as any)?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
         
    if (!identifier) return NextResponse.json({ error: "Identifiant d'offre invalide." }, { status: 400 });
         
    // 🔍 Utilisation de notre helper unifié (Slug ou UID)
    const barter = await findEntityBySlugOrUid(BarterOfferModel, identifier);
    if (!barter) return NextResponse.json({ error: "Offre introuvable." }, { status: 404 });
         
    return NextResponse.json(barter, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
});

// ==========================================
// PATCH : Résoudre le troc (Strictement Privé / Aura)
// ==========================================
export const PATCH = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    
    const resolvedParams = await context.params;
    const rawSlug = (resolvedParams as any)?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    
    if (!identifier) return NextResponse.json({ error: "Identifiant d'offre invalide." }, { status: 400 });

    const barter = await findEntityBySlugOrUid(BarterOfferModel, identifier);
    if (!barter) return NextResponse.json({ error: "Offre introuvable." }, { status: 404 });

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };
    
    const orchestrator = new EcommerceOrchestrator();
    const result = await orchestrator.resolveBarter({
      barterUid: (barter as any).uid || identifier,
      acceptorUid: currentUser.uid,
      status: body.status || (body.action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED')
    }, signature);
    
    // Invalidation
    revalidateTag('barter-offers');
    revalidateTag(`barter-${identifier}`);
    revalidateTag(`barter-${(barter as any).uid}`);
    
    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Échec de résolution." }, { status: error.statusCode || 500 });
  }
});