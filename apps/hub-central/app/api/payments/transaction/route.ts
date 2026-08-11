export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { KomptaPaymentOrchestrator } from '@ilot/shared-core';
import { IlotError } from '@ilot/shared-core';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { revalidateTag } from 'next/cache';

const komptaOrchestrator = new KomptaPaymentOrchestrator();

// ==========================================
// 🛍️ POST : Transaction Marchande (Le Chapeau)
// ==========================================
export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ success: false, error: 'Paramètres de transaction illisibles.' }, { status: 400 });
    }

    const { transactionUid, recipientUid, amountCents, currency, storeUid, description } = body;
    
    if (!transactionUid || !recipientUid || !amountCents) {
      return NextResponse.json({ success: false, error: 'Paramètres de transaction manquants.' }, { status: 400 });
    }

    const signature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    const result = await komptaOrchestrator.executeStoreTransaction(
      {
        transactionUid,
        buyerUid: currentUser.uid,
        recipientUid,
        amountCents,
        currency: currency || 'EUR',
        storeUid,
        sourcePage: 'floating_chapeau',
        description
      },
      signature
    );

    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade suite au paiement
    revalidateTag('kompta-ledger');
    revalidateTag('user-wallet');
    revalidateTag(`user-wallet-${currentUser.uid}`);
    revalidateTag(`user-wallet-${recipientUid}`);
    if (storeUid) {
      revalidateTag(`store-products-${storeUid}`);
    }

    return NextResponse.json(result, { status: 201 });

  } catch (error: any) {
    console.error('[API Transaction Error] :', error);
    const statusCode = error instanceof IlotError ? error.status : 500;
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de la transaction du Chapeau.' },
      { status: statusCode }
    );
  }
});