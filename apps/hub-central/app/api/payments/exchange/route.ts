export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { KomptaPaymentOrchestrator } from '@ilot/shared-core';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';

const komptaOrchestrator = new KomptaPaymentOrchestrator();

// 🛡️ Schéma de validation Zod pour sécuriser le payload d'échange
const ExchangeItemSchema = z.object({
  exchangeUid: z.string().optional(),
  recipientUid: z.string().min(1, "Le destinataire est requis."),
  offeredItemUid: z.string().min(1, "L'objet offert est requis."),
  targetTitle: z.string().optional(),
  description: z.string().optional(),
});

type ExchangeItemInput = z.infer<typeof ExchangeItemSchema>;

// ==========================================
// 📦 POST : Troc d'Objet / Création (Le Chapeau)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Paramètres d\'échange illisibles.' }, { status: 400 });
    }

    const validationResult = ExchangeItemSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: 'Paramètres d\'échange manquants ou invalides.', 
        details: validationResult.error.flatten() 
      }, { status: 400 });
    }

    const validatedData: ExchangeItemInput = validationResult.data;

    const signature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    const result = await komptaOrchestrator.executeItemExchange(
      {
        exchangeUid: validatedData.exchangeUid || `ex_${Date.now()}`,
        senderUid: currentUser.uid,
        recipientUid: validatedData.recipientUid,
        offeredItemUid: validatedData.offeredItemUid,
        targetTitle: validatedData.targetTitle || 'Création de la canopée',
        description: validatedData.description
      },
      signature
    );

    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade suite au troc
    revalidateTag('barter-offers');
    revalidateTag(`user-inventory-${currentUser.uid}`);
    revalidateTag(`user-inventory-${validatedData.recipientUid}`);

    return NextResponse.json(result, { status: 201 });

  } catch (error: unknown) {
    return handleRouteError(error, 'API EXCHANGE ERROR');
  }
});