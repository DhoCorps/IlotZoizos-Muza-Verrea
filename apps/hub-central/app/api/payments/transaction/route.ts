export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { KomptaPaymentOrchestrator } from '@ilot/shared-core';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';

const komptaOrchestrator = new KomptaPaymentOrchestrator();

// 🛡️ Schéma Zod pour sécuriser la transaction marchande
const TransactionSchema = z.object({
  transactionUid: z.string().min(1, "L'identifiant de transaction est requis."),
  recipientUid: z.string().min(1, "Le destinataire est requis."),
  amountCents: z.number().positive("Le montant doit être positif."),
  currency: z.string().optional(),
  storeUid: z.string().optional(),
  description: z.string().optional(),
});

type TransactionInput = z.infer<typeof TransactionSchema>;

// ==========================================
// 🛍️ POST : Transaction Marchande (Le Chapeau)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Paramètres de transaction illisibles.' }, { status: 400 });
    }

    const validationResult = TransactionSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: 'Paramètres de transaction manquants ou invalides.', 
        details: validationResult.error.flatten() 
      }, { status: 400 });
    }

    const validatedData: TransactionInput = validationResult.data;

    const signature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    const result = await komptaOrchestrator.executeStoreTransaction(
      {
        transactionUid: validatedData.transactionUid,
        buyerUid: currentUser.uid,
        recipientUid: validatedData.recipientUid,
        amountCents: validatedData.amountCents,
        currency: validatedData.currency || 'EUR',
        storeUid: validatedData.storeUid,
        sourcePage: 'floating_chapeau',
        description: validatedData.description
      },
      signature
    );

    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade suite au paiement
    revalidateTag('kompta-ledger');
    revalidateTag('user-wallet');
    revalidateTag(`user-wallet-${currentUser.uid}`);
    revalidateTag(`user-wallet-${validatedData.recipientUid}`);
    if (validatedData.storeUid) {
      revalidateTag(`store-products-${validatedData.storeUid}`);
    }

    return NextResponse.json(result, { status: 201 });

  } catch (error: unknown) {
    return handleRouteError(error, 'API TRANSACTION ERROR');
  }
});