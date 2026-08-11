export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { PaymentTokenizationOrchestrator } from '@ilot/shared-core';
import { IlotError } from '@ilot/shared-core';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { revalidateTag } from 'next/cache';

const paymentOrchestrator = new PaymentTokenizationOrchestrator();

// ==========================================
// 💳 POST : Liaison de Profil de Paiement Externe
// ==========================================
export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ success: false, error: 'Paramètres de tokenisation illisibles.' }, { status: 400 });
    }

    const { externalCustomerId, defaultPaymentMethodId } = body;
    
    if (!externalCustomerId || !defaultPaymentMethodId) {
      return NextResponse.json({ success: false, error: 'Paramètres de tokenisation manquants.' }, { status: 400 });
    }

    const signature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    const result = await paymentOrchestrator.linkExternalPaymentProfile(
      {
        userUid: currentUser.uid,
        externalCustomerId,
        defaultPaymentMethodId
      },
      signature
    );

    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade suite à la liaison du wallet
    revalidateTag('user-wallet');
    revalidateTag(`user-wallet-${currentUser.uid}`);
    revalidateTag(`payment-profile-${currentUser.uid}`);

    return NextResponse.json(result, { status: 201 });

  } catch (error: any) {
    console.error('[API Payment Wallet Error] :', error);
    const statusCode = error instanceof IlotError ? error.status : 500;
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur interne de la matrice de paiement.' },
      { status: statusCode }
    );
  }
});