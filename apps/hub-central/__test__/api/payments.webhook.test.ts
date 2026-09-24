import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/payments/webhook/route';
import { KomptaPaymentOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { NextRequest } from 'next/server';

// 1. Mock du Cache Next.js
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn: Function) => fn),
}));

// Mock souverain du garde `withSilice`
vi.mock('@/lib/api-guards', () => ({
  withSilice: (handler: Function) => async (req: NextRequest, context: unknown) => {
    return await handler(req, context);
  },
  handleRouteError: (error: unknown, context: string) => {
    const err = error as Error;
    console.error(`[${context}]`, err);
    return new Response(JSON.stringify({ error: err.message || 'Erreur traitement webhook.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  },
}));

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Webhook Trésorerie (POST /api/payments/webhook)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 🛡️ SUTURE CHIRURGICALE : On espionne directement la méthode de l'orchestrateur réel
    vi.spyOn(KomptaPaymentOrchestrator.prototype, 'processExternalPayment').mockResolvedValue({
      success: true,
      depositUid: 'pi_12345'
    } as unknown as Awaited<ReturnType<KomptaPaymentOrchestrator['processExternalPayment']>>);
  });

  it('🔴 doit rejeter (401) si la signature cryptographique est manquante', async () => {
    const req = new NextRequest('http://localhost/api/payments/webhook', {
      method: 'POST',
      body: JSON.stringify({ type: 'payment_intent.succeeded' }),
      headers: new Headers({})
    });

    const response = await POST(req, { params: Promise.resolve({}) });
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Signature manquante.");
  });

  it('🟢 doit acquitter (200) un événement ignoré sans appeler l\'orchestrateur', async () => {
    const req = new NextRequest('http://localhost/api/payments/webhook', {
      method: 'POST',
      body: JSON.stringify({ type: 'payment_method.attached' }),
      headers: new Headers({ 'stripe-signature': 'signature_valide' })
    });

    const response = await POST(req, { params: Promise.resolve({}) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.received).toBe(true);
    expect(KomptaPaymentOrchestrator.prototype.processExternalPayment).not.toHaveBeenCalled();
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('🟢 doit traiter un paiement réussi (200), déclencher la comptabilisation en centimes et invalider le cache', async () => {
    const mockPaymentData = { 
      id: 'pi_12345', 
      amount: 5000, // 50.00 EUR en centimes stricts
      currency: 'eur',
      metadata: { recipientUid: 'bird_investor_1' }
    };
    const mockEvent = {
      type: 'payment_intent.succeeded',
      data: { object: mockPaymentData }
    };

    const req = new NextRequest('http://localhost/api/payments/webhook', {
      method: 'POST',
      body: JSON.stringify(mockEvent),
      headers: new Headers({ 'stripe-signature': 'signature_valide_test' })
    });

    const response = await POST(req, { params: Promise.resolve({}) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.received).toBe(true);

    // 🎯 Vérification que l'orchestrateur a bien été invoqué avec les données du paiement
    expect(KomptaPaymentOrchestrator.prototype.processExternalPayment).toHaveBeenCalledWith(mockPaymentData);

    // 💥 Vérification de l'invalidation chirurgicale du cache de la trésorerie
    expect(revalidateTag).toHaveBeenCalledWith('kompta-ledger');
    expect(revalidateTag).toHaveBeenCalledWith('user-wallet');
    expect(revalidateTag).toHaveBeenCalledWith('user-wallet-bird_investor_1');
  });
});