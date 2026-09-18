import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/payments/transaction/route';
import { KomptaPaymentOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { NextResponse, NextRequest } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn: Function) => fn),
}));

// Mock souverain aligné sur notre standard de gardes d'API (`withAura`)
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const mockUser = global.__mockUser;
    if (!mockUser || !mockUser.uid) {
      return NextResponse.json({ error: "Le Nexus est invisible aux étrangers." }, { status: 401 });
    }
    return await handler(req, context, mockUser);
  },
}));

// 🛡️ Déclaration globale standardisée et flexible de __mockUser
declare global {
  var __mockUser: {
    uid: string;
    capabilities: string[];
    [key: string]: unknown;
  } | undefined;
}

describe('API Payments Transaction - POST /api/payments/transaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;

    // 🛡️ SUTURE CHIRURGICALE : Espionnage direct de executeStoreTransaction sur le prototype
    vi.spyOn(KomptaPaymentOrchestrator.prototype, 'executeStoreTransaction').mockResolvedValue({
      success: true,
      transactionUid: 'tx_test_chapeau_001',
      newBuyerBalance: 8500,
      newRecipientBalance: 6500,
    } as unknown as Awaited<ReturnType<KomptaPaymentOrchestrator['executeStoreTransaction']>>);
  });

  it('doit rejeter (401) si l\'oiseau n\'est pas authentifié', async () => {
    delete global.__mockUser;

    const req = new NextRequest('http://localhost:3000/api/payments/transaction', {
      method: 'POST',
      body: JSON.stringify({
        transactionUid: 'tx_1',
        recipientUid: 'bird_recipient',
        amountCents: 150,
      }),
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Le Nexus est invisible aux étrangers.");
  });

  it('doit réussir (201), exécuter la transaction marchande et invalider le cache', async () => {
    global.__mockUser = { uid: 'bird_buyer_123', capabilities: [] };

    const req = new NextRequest('http://localhost:3000/api/payments/transaction', {
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

    const res = await POST(req, { params: Promise.resolve({}) });
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