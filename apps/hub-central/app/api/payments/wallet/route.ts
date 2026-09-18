export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { PaymentTokenizationOrchestrator } from '@ilot/shared-core';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';

const paymentOrchestrator = new PaymentTokenizationOrchestrator();

// 🛡️ Schéma Zod pour sécuriser la liaison du profil de paiement
const WalletTokenizeSchema = z.object({
  externalCustomerId: z.string().min(1, "L'identifiant client externe est requis."),
  defaultPaymentMethodId: z.string().min(1, "Le moyen de paiement par défaut est requis."),
});

type WalletTokenizeInput = z.infer<typeof WalletTokenizeSchema>;

// ==========================================
// 💳 POST : Liaison de Profil de Paiement Externe
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Paramètres de tokenisation illisibles.' }, { status: 400 });
    }

    const validationResult = WalletTokenizeSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: 'Paramètres de tokenisation manquants ou invalides.', 
        details: validationResult.error.flatten() 
      }, { status: 400 });
    }

    const validatedData: WalletTokenizeInput = validationResult.data;

    const signature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    const result = await paymentOrchestrator.linkExternalPaymentProfile(
      {
        userUid: currentUser.uid,
        externalCustomerId: validatedData.externalCustomerId,
        defaultPaymentMethodId: validatedData.defaultPaymentMethodId
      },
      signature
    );

    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade suite à la liaison du wallet
    revalidateTag('user-wallet');
    revalidateTag(`user-wallet-${currentUser.uid}`);
    revalidateTag(`payment-profile-${currentUser.uid}`);

    return NextResponse.json(result, { status: 201 });

  } catch (error: unknown) {
    return handleRouteError(error, 'API PAYMENT WALLET ERROR');
  }
});