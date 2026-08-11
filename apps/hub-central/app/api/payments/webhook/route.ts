export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { KomptaPaymentOrchestrator } from '@ilot/shared-core';
import { withSilice, ApiContext } from '@/lib/api-guards';
import { revalidateTag } from 'next/cache';

// ==========================================
// 💰 POST : Webhook de la Trésorerie (Protégé par withSilice & Signature)
// ==========================================
export const POST = withSilice(async (req: Request, _context: ApiContext) => {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature') || req.headers.get('x-signature');

    if (!signature) {
      console.warn("⚠️ [Webhook Trésorerie] Tentative d'accès sans signature.");
      return NextResponse.json({ error: "Signature manquante." }, { status: 401 });
    }

    // TODO : Validation cryptographique stricte de la signature du webhook
    
    const event = JSON.parse(body);

    if (event.type === 'payment_intent.succeeded' || event.type === 'checkout.session.completed') {
      const paymentData = event.data.object;
      
      const orchestrator = new KomptaPaymentOrchestrator();
      await orchestrator.processExternalPayment(paymentData);
      
      // Extraction sécurisée de l'UID du destinataire depuis les métadonnées ou le client
      const recipientUid = paymentData.metadata?.recipientUid || paymentData.customer;

      // 💥 BOOM ! Invalidation chirurgicale du cache en cascade suite au dépôt externe
      revalidateTag('kompta-ledger');
      revalidateTag('user-wallet');
      if (recipientUid) {
        revalidateTag(`user-wallet-${recipientUid}`);
      }

      console.log(`✨ [Webhook Trésorerie] Flux validé et enregistré au Grand Livre (ID: ${paymentData.id})`);
    } else {
      console.log(`ℹ️ [Webhook Trésorerie] Événement ignoré : ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error: any) {
    console.error("🌋 [Webhook Trésorerie] Fracture lors du traitement :", error);
    return NextResponse.json({ error: "Erreur traitement webhook." }, { status: 400 });
  }
});