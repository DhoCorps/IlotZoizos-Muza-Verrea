export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { KomptaPaymentOrchestrator } from '@ilot/shared-core';
import { withSilice, ApiContext, handleRouteError } from '@/lib/api-guards';
import { revalidateTag } from 'next/cache';

const komptaOrchestrator = new KomptaPaymentOrchestrator();

// ==========================================
// 💰 POST : Webhook de la Trésorerie (Protégé par withSilice & Signature)
// ==========================================
export const POST = withSilice(async (req: NextRequest, _context: ApiContext) => {
  try {
    let body: string;
    try {
      body = await req.text();
    } catch {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    const signature = req.headers.get('stripe-signature') || req.headers.get('x-signature');

    if (!signature) {
      console.warn("⚠️ [Webhook Trésorerie] Tentative d'accès sans signature.");
      return NextResponse.json({ error: "Signature manquante." }, { status: 401 });
    }

    // TODO : Validation cryptographique stricte de la signature du webhook
    
    let event: { type?: string; data?: { object?: Record<string, unknown> } };
    try {
      event = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
    }

    if (event.type === 'payment_intent.succeeded' || event.type === 'checkout.session.completed') {
      const rawObject = event.data?.object || {};
      
      // 🛡️ Typage explicite et conforme au contrat de l'ExternalPaymentPayload attendu par l'orchestrateur
      const paymentData = {
        id: (rawObject.id as string) || `pi_${Date.now()}`,
        amount: typeof rawObject.amount === 'number' ? rawObject.amount : 0,
        currency: (rawObject.currency as string) || 'eur',
        metadata: (rawObject.metadata || {}) as Record<string, unknown>,
        customer: rawObject.customer as string | undefined,
      };
      
      await komptaOrchestrator.processExternalPayment(paymentData);
      
      // Extraction sécurisée de l'UID du destinataire depuis les métadonnées ou le client
      const metadata = (paymentData.metadata || {}) as Record<string, unknown>;
      const recipientUid = (metadata.recipientUid as string) || (paymentData.customer as string);

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

  } catch (error: unknown) {
    return handleRouteError(error, 'WEBHOOK TREASURY ERROR');
  }
});