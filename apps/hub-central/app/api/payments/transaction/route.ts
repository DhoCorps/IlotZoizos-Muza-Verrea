import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { KomptaPaymentOrchestrator } from '@ilot/shared-core';
import { IlotError } from '@ilot/shared-core';

const komptaOrchestrator = new KomptaPaymentOrchestrator();

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Oiseau non authentifié.' }, { status: 401 });
    }

    const body = await req.json();
    const { transactionUid, recipientUid, amountCents, currency, storeUid, description } = body;
    
    const buyerUid = (session.user as any).uid || session.user.email;

    const signature = {
      actorUid: buyerUid,
      capabilities: (session.user as any).capabilities || []
    };

    const result = await komptaOrchestrator.executeStoreTransaction(
      {
        transactionUid,
        buyerUid,
        recipientUid,
        amountCents,
        currency: currency || 'EUR',
        storeUid,
        sourcePage: 'floating_chapeau',
        description
      },
      signature
    );

    return NextResponse.json(result, { status: 201 });

  } catch (error: any) {
    console.error('[API Transaction Error] :', error);
    const statusCode = error instanceof IlotError ? error.status : 500;
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de la transaction du Chapeau.' },
      { status: statusCode }
    );
  }
}