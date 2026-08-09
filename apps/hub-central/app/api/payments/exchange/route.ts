// apps/hub-central/app/api/payments/exchange/route.ts
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
    const { exchangeUid, recipientUid, offeredItemUid, targetTitle, description } = body;
    
    const senderUid = (session.user as any).uid || session.user.email;

    if (!recipientUid || !offeredItemUid) {
      return NextResponse.json({ success: false, error: 'Paramètres d\'échange manquants.' }, { status: 400 });
    }

    const signature = {
      actorUid: senderUid,
      capabilities: (session.user as any).capabilities || []
    };

    const result = await komptaOrchestrator.executeItemExchange(
      {
        exchangeUid: exchangeUid || `ex_${Date.now()}`,
        senderUid,
        recipientUid,
        offeredItemUid,
        targetTitle: targetTitle || 'Création de la canopée',
        description
      },
      signature
    );

    return NextResponse.json(result, { status: 201 });

  } catch (error: any) {
    console.error('[API Exchange Error] :', error);
    const statusCode = error instanceof IlotError ? error.status : 500;
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors du troc via le Chapeau.' },
      { status: statusCode }
    );
  }
}