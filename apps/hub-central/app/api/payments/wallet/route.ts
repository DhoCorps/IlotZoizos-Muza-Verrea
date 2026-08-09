// apps/hub-central/app/api/payments/wallet/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { PaymentTokenizationOrchestrator } from '@ilot/shared-core';
import { IlotError } from '@ilot/shared-core';

const paymentOrchestrator = new PaymentTokenizationOrchestrator();

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Oiseau non authentifié.' }, { status: 401 });
    }

    const body = await req.json();
    const { externalCustomerId, defaultPaymentMethodId } = body;
    
    const actorUid = (session.user as any).uid || session.user.email;

    if (!externalCustomerId || !defaultPaymentMethodId) {
      return NextResponse.json({ success: false, error: 'Paramètres de tokenisation manquants.' }, { status: 400 });
    }

    const signature = {
      actorUid,
      capabilities: (session.user as any).capabilities || []
    };

    const result = await paymentOrchestrator.linkExternalPaymentProfile(
      {
        userUid: actorUid,
        externalCustomerId,
        defaultPaymentMethodId
      },
      signature
    );

    return NextResponse.json(result, { status: 201 });

  } catch (error: any) {
    console.error('[API Payment Wallet Error] :', error);
    // 👈 Utiliser 'error.status' puisque c'est la propriété définie dans IlotError
    const statusCode = error instanceof IlotError ? error.status : 500;
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur interne de la matrice de paiement.' },
      { status: statusCode }
    );
  }
}