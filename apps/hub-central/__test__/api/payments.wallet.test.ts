import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/payments/wallet/route';
import { getServerSession } from 'next-auth/next';
import { PaymentTokenizationOrchestrator } from '@ilot/shared-core';

// 1. Mock de NextAuth pour contrôler la session
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

describe('API Payments Wallet - POST /api/payments/wallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;

    // 🛡️ SUTURE CHIRURGICALE : Espionnage direct sur le prototype de l'orchestrateur
    vi.spyOn(PaymentTokenizationOrchestrator.prototype, 'linkExternalPaymentProfile').mockResolvedValue({
      success: true,
      userUid: 'bird_test_123',
      hasActiveWallet: true,
    } as any);
  });

  it('doit rejeter (401) si l\'oiseau n\'est pas authentifié', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = new Request('http://localhost:3000/api/payments/wallet', {
      method: 'POST',
      body: JSON.stringify({
        externalCustomerId: 'cus_123',
        defaultPaymentMethodId: 'pm_456',
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.success).toBe(false);
  });

  it('doit rejeter (400) si les paramètres de tokenisation sont manquants', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { name: 'Oiseau Test', email: 'bird@ilot.fr', uid: 'bird_test_123' },
    } as any);

    const req = new Request('http://localhost:3000/api/payments/wallet', {
      method: 'POST',
      body: JSON.stringify({
        externalCustomerId: 'cus_123', // Manque defaultPaymentMethodId
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Paramètres de tokenisation manquants');
  });

  it('doit réussir (201) et lier les références de paiement de l\'oiseau connecté', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { name: 'Oiseau Test', email: 'bird@ilot.fr', uid: 'bird_test_123', capabilities: ['*'] },
    } as any);

    const req = new Request('http://localhost:3000/api/payments/wallet', {
      method: 'POST',
      body: JSON.stringify({
        externalCustomerId: 'cus_stripe_789',
        defaultPaymentMethodId: 'pm_card_999',
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.userUid).toBe('bird_test_123');
    expect(data.hasActiveWallet).toBe(true);
  });
});