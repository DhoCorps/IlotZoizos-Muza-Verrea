import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/payments/transaction/route';
import { getServerSession } from 'next-auth/next';
import { KomptaPaymentOrchestrator } from '@ilot/shared-core';

// 1. Mock de NextAuth pour contrôler la session utilisateur
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

describe('API Payments Transaction - POST /api/payments/transaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;

    // 🛡️ SUTURE CHIRURGICALE : Espionnage direct de executeStoreTransaction sur le prototype
    vi.spyOn(KomptaPaymentOrchestrator.prototype, 'executeStoreTransaction').mockResolvedValue({
      success: true,
      transactionUid: 'tx_test_chapeau_001',
      newBuyerBalance: 8500,
      newRecipientBalance: 6500,
    } as any);
  });

  it('doit rejeter (401) si l\'oiseau n\'est pas authentifié', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = new Request('http://localhost:3000/api/payments/transaction', {
      method: 'POST',
      body: JSON.stringify({
        transactionUid: 'tx_1',
        recipientUid: 'bird_recipient',
        amountCents: 150,
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Oiseau non authentifié');
  });

  it('doit réussir (201) et exécuter la transaction marchande du Chapeau', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { name: 'Oiseau Acheteur', email: 'buyer@ilot.fr', uid: 'bird_buyer_123' },
    } as any);

    const req = new Request('http://localhost:3000/api/payments/transaction', {
      method: 'POST',
      body: JSON.stringify({
        transactionUid: 'tx_test_chapeau_001',
        recipientUid: 'bird_recipient_456',
        amountCents: 150, // 1.50 EUR
        currency: 'EUR',
        description: 'Pourboire depuis le Chapeau flottant',
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.transactionUid).toBe('tx_test_chapeau_001');
    expect(data.newBuyerBalance).toBe(8500);
    expect(data.newRecipientBalance).toBe(6500);
  });
});