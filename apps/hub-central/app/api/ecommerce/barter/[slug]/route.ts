export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { BarterOfferModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { IBarterOffer } from '@ilot/types';
import { EcommerceOrchestrator, EcommerceSyncResult } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

// ==========================================
// 🛡️ SCHÉMA ZOD (Validation stricte pour la résolution du troc)
// ==========================================
const ResolveBarterSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED']).optional(),
  action: z.enum(['ACCEPT', 'REJECT']).optional(),
}).refine(data => data.status !== undefined || data.action !== undefined, {
  message: "Un statut ou une action (status ou action) est requis pour résoudre le troc.",
});

// ==========================================
// GET : Ausculter une offre (Public / Silice)
// ==========================================
export const GET = withSilice(async (_req: NextRequest, context: ApiContext) => {
  try {
    let resolvedParams: { slug?: string | string[] } | undefined;
    try {
      resolvedParams = await context.params;
    } catch {
      return NextResponse.json({ success: false, error: "Paramètres de route invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
         
    if (!identifier) {
      return NextResponse.json({ success: false, error: "Identifiant d'offre invalide." }, { status: 400 });
    }
         
    // 🔍 Utilisation de notre helper unifié (Slug ou UID)
    const barter = await findEntityBySlugOrUid(BarterOfferModel, identifier) as IBarterOffer | null;
    if (!barter) {
      return NextResponse.json({ success: false, error: "Offre introuvable." }, { status: 404 });
    }
         
    return NextResponse.json(barter, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors de la lecture de l'offre de troc.");
  }
});

// ==========================================
// PATCH : Résoudre le troc (Strictement Privé / Aura)
// ==========================================
export const PATCH = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Corps de requête illisible." }, { status: 400 });
    }

    // 🛡️ Validation stricte via Zod
    const validationResult = ResolveBarterSchema.safeParse(rawBody);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues.map(e => e.message).join(', ');
      return NextResponse.json({ success: false, error: `Données de résolution invalides : ${errorMessage}` }, { status: 400 });
    }

    const bodyData = validationResult.data;
    
    let resolvedParams: { slug?: string | string[] } | undefined;
    try {
      resolvedParams = await context.params;
    } catch {
      return NextResponse.json({ success: false, error: "Paramètres de route invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    
    if (!identifier) {
      return NextResponse.json({ success: false, error: "Identifiant d'offre invalide." }, { status: 400 });
    }

    const barter = await findEntityBySlugOrUid(BarterOfferModel, identifier) as IBarterOffer | null;
    if (!barter) {
      return NextResponse.json({ success: false, error: "Offre introuvable." }, { status: 404 });
    }

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };
    
    const resolvedStatus = bodyData.status || (bodyData.action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED');

    const orchestrator = new EcommerceOrchestrator();
    const result: EcommerceSyncResult = await orchestrator.resolveBarter({
      barterUid: barter.uid || identifier,
      acceptorUid: currentUser.uid,
      status: resolvedStatus
    }, signature);
    
    // Invalidation
    revalidateTag('barter-offers');
    revalidateTag(`barter-${identifier}`);
    if (barter.uid) {
      revalidateTag(`barter-${barter.uid}`);
    }
    
    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "Échec de la résolution du troc.");
  }
});