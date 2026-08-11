import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/payments/webhook/route';
import { KomptaPaymentOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';

// 1. Mock du Cache Next.js
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
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
    });
  });

  it('🔴 doit rejeter (401) si la signature cryptographique est manquante', async () => {
    const req = new Request('http://localhost/api/payments/webhook', {
      method: 'POST',
      body: JSON.stringify({ type: 'payment_intent.succeeded' }),
      headers: new Headers({})
    });

    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Signature manquante.");
  });

  it('🟢 doit acquitter (200) un événement ignoré sans appeler l\'orchestrateur', async () => {
    const req = new Request('http://localhost/api/payments/webhook', {
      method: 'POST',
      body: JSON.stringify({ type: 'payment_method.attached' }),
      headers: new Headers({ 'stripe-signature': 'signature_valide' })
    });

    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.received).toBe(true);
    expect(KomptaPaymentOrchestrator.prototype.processExternalPayment).not.toHaveBeenCalled();
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('🟢 doit traiter un paiement réussi (200), déclencher la comptabilisation et invalider le cache', async () => {
    const mockPaymentData = { 
      id: 'pi_12345', 
      amount: 5000, 
      currency: 'eur',
      metadata: { recipientUid: 'bird_investor_1' }
    };
    const mockEvent = {
      type: 'payment_intent.succeeded',
      data: { object: mockPaymentData }
    };

    const req = new Request('http://localhost/api/payments/webhook', {
      method: 'POST',
      body: JSON.stringify(mockEvent),
      headers: new Headers({ 'stripe-signature': 'signature_valide_test' })
    });

    const response = await POST(req);
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