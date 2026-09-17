export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { BarterOfferModel, OiseauModel } from '@ilot/infrastructure';
import { IOiseau} from '@ilot/types';
import { EcommerceOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { v4 as uuidv4 } from 'uuid';
import { revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { getCachedPendingBarters } from '@/lib/cache/ecommerce.cache';
import { z } from 'zod';

// ==========================================
// 🛡️ SCHÉMAS ZOD (Validation stricte)
// ==========================================
const CreateBarterSchema = z.object({
  receiverUid: z.string().optional(),
  offeredProductUids: z.array(z.string()).min(1, "Au moins un produit offert est requis."),
  requestedProductUids: z.array(z.string()).min(1, "Au moins un produit demandé est requis."),
});

const ResolveBarterSchema = z.object({
  barterUid: z.string().min(1, "Identifiant de troc requis."),
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED']),
});

// ==========================================
// GET : Recenser les offres de troc en attente (Public / Silice)
// ==========================================
export const GET = withSilice(async (_req: NextRequest, _context: ApiContext) => {
  try {
    const offers = await getCachedPendingBarters();
    return NextResponse.json(offers, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors du recensement des offres de troc.");
  }
});

// ==========================================
// POST : Proposer un troc (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Corps de requête illisible." }, { status: 400 });
    }

    // 🛡️ Validation stricte via Zod
    const validationResult = CreateBarterSchema.safeParse(rawBody);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues.map(e => e.message).join(', ');
      return NextResponse.json({ success: false, error: `Données de troc invalides : ${errorMessage}` }, { status: 400 });
    }

    const bodyData = validationResult.data;

    // 🛡️ Uniformisation stricte sur currentUser.uid (garanti par le gardien withAura)
    const initiatorUid = currentUser.uid;
    
    // 🛡️ DOUANE VIBRATOIRE : Vérification du statut de l'Oiseau dans le Tribunal de la Canopée
    const oiseauProfile = await OiseauModel.findOne({ uid: initiatorUid }).lean() as IOiseau | null;
    if (oiseauProfile && (oiseauProfile.isBanned || oiseauProfile.profileStatus === 'INDESIRABLE')) {
      return NextResponse.json({ 
         success: false,
         error: "Souveraineté restreinte : Votre fréquence est jugée indésirable. Le Grand Bazar vous est fermé." 
      }, { status: 403 });
    }
    
    const barterUid = `barter_${uuidv4()}`;
    const newOffer = await BarterOfferModel.create({
      ...bodyData,
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
           receiverUid: bodyData.receiverUid, 
           offeredUids: bodyData.offeredProductUids, 
           requestedUids: bodyData.requestedProductUids 
         },
        { actorUid: initiatorUid, capabilities: currentUser.capabilities || [] } as ActionSignature
      );
    } catch (orchErr: unknown) {
      console.error("  [ECOMMERCE ORCHESTRATOR PROPOSE ERROR]", orchErr);
    }
    
    // 💥 Invalidation chirurgicale du cache en cascade
    revalidateTag('barter-offers');
    revalidateTag('pending-barters');
    revalidateTag(`user-barters-${initiatorUid}`);
    return NextResponse.json({ success: true, data: newOffer }, { status: 201 });
  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors de la proposition de troc.");
  }
});

// ==========================================
// PATCH : Résoudre / Mettre à jour une offre de troc (Strictement Privé / Aura)
// ==========================================
export const PATCH = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
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
      return NextResponse.json({ success: false, error: `Requête de résolution invalide : ${errorMessage}` }, { status: 400 });
    }

    const { barterUid, status } = validationResult.data;

    // 🛡️ Uniformisation stricte sur currentUser.uid (garanti par le gardien withAura)
    const acceptorUid = currentUser.uid;
    
    const oiseauProfile = await OiseauModel.findOne({ uid: acceptorUid }).lean() as IOiseau | null;
    if (oiseauProfile && (oiseauProfile.isBanned || oiseauProfile.profileStatus === 'INDESIRABLE')) {
      return NextResponse.json({ 
         success: false,
         error: "Souveraineté restreinte : Votre fréquence est jugée indésirable." 
      }, { status: 403 });
    }
    
    const updated = await BarterOfferModel.findOneAndUpdate(
      { uid: barterUid },
      { $set: { status } },
      { new: true }
    );
    if (!updated) {
      return NextResponse.json({ success: false, error: "Offre de troc introuvable." }, { status: 404 });
    }
    
    try {
      const orchestrator = new EcommerceOrchestrator();
      await orchestrator.resolveBarter(
        { barterUid, acceptorUid, status },
        { actorUid: acceptorUid, capabilities: currentUser.capabilities || [] } as ActionSignature
      );
    } catch (orchErr: unknown) {
      console.error("  [ECOMMERCE ORCHESTRATOR RESOLVE MAIN ERROR]", orchErr);
    }
    
    // 💥 Invalidation chirurgicale du cache en cascade
    revalidateTag('barter-offers');
    revalidateTag('pending-barters');
    revalidateTag(`barter-${barterUid}`);
    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors de la résolution du troc.");
  }
});