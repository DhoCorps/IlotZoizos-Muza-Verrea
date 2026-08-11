export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { KomptaPaymentOrchestrator } from '@ilot/shared-core';
import { IlotError } from '@ilot/shared-core';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { revalidateTag } from 'next/cache';

const komptaOrchestrator = new KomptaPaymentOrchestrator();

// ==========================================
// 📦 POST : Troc d'Objet / Création (Le Chapeau)
// ==========================================
export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ success: false, error: 'Paramètres d\'échange illisibles.' }, { status: 400 });
    }

    const { exchangeUid, recipientUid, offeredItemUid, targetTitle, description } = body;
    
    if (!recipientUid || !offeredItemUid) {
      return NextResponse.json({ success: false, error: 'Paramètres d\'échange manquants.' }, { status: 400 });
    }

    const signature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    const result = await komptaOrchestrator.executeItemExchange(
      {
        exchangeUid: exchangeUid || `ex_${Date.now()}`,
        senderUid: currentUser.uid,
        recipientUid,
        offeredItemUid,
        targetTitle: targetTitle || 'Création de la canopée',
        description
      },
      signature
    );

    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade suite au troc
    revalidateTag('barter-offers');
    revalidateTag(`user-inventory-${currentUser.uid}`);
    revalidateTag(`user-inventory-${recipientUid}`);

    return NextResponse.json(result, { status: 201 });

  } catch (error: any) {
    console.error('[API Exchange Error] :', error);
    const statusCode = error instanceof IlotError ? error.status : 500;
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors du troc via le Chapeau.' },
      { status: statusCode }
    );
  }
});