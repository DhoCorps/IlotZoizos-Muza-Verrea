import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/payments/transaction/route';
import { getServerSession } from 'next-auth/next';
import { KomptaPaymentOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';

// 1. Mocks de NextAuth et du Cache Next.js
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
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
    // Vérification du message standardisé de notre garde "withAura"
    expect(data.error).toBe("Le Nexus est invisible aux étrangers.");
  });

  it('doit réussir (201), exécuter la transaction marchande et invalider le cache', async () => {
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
        storeUid: 'store_789',
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

    // 💥 Vérification de l'invalidation chirurgicale du cache en cascade
    expect(revalidateTag).toHaveBeenCalledWith('kompta-ledger');
    expect(revalidateTag).toHaveBeenCalledWith('user-wallet');
    expect(revalidateTag).toHaveBeenCalledWith('user-wallet-bird_buyer_123');
    expect(revalidateTag).toHaveBeenCalledWith('user-wallet-bird_recipient_456');
    expect(revalidateTag).toHaveBeenCalledWith('store-products-store_789');
  });
});