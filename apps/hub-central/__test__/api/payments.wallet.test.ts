import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/payments/wallet/route';
import { PaymentTokenizationOrchestrator } from '@ilot/shared-core';
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

describe('API Payments Wallet - POST /api/payments/wallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;

    // 🛡️ SUTURE CHIRURGICALE : Espionnage direct sur le prototype de l'orchestrateur
    vi.spyOn(PaymentTokenizationOrchestrator.prototype, 'linkExternalPaymentProfile').mockResolvedValue({
      success: true,
      userUid: 'bird_test_123',
      hasActiveWallet: true,
    } as unknown as Awaited<ReturnType<PaymentTokenizationOrchestrator['linkExternalPaymentProfile']>>);
  });

  it('doit rejeter (401) si l\'oiseau n\'est pas authentifié', async () => {
    delete global.__mockUser;

    const req = new NextRequest('http://localhost:3000/api/payments/wallet', {
      method: 'POST',
      body: JSON.stringify({
        externalCustomerId: 'cus_123',
        defaultPaymentMethodId: 'pm_456',
      }),
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Le Nexus est invisible aux étrangers.");
  });

  it('doit rejeter (400) si les paramètres de tokenisation sont manquants', async () => {
    global.__mockUser = { uid: 'bird_test_123', capabilities: [] };

    const req = new NextRequest('http://localhost:3000/api/payments/wallet', {
      method: 'POST',
      body: JSON.stringify({
        externalCustomerId: 'cus_123', // Manque defaultPaymentMethodId
      }),
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Paramètres de tokenisation manquants');
  });

  it('doit réussir (201), lier les références de paiement et invalider le cache', async () => {
    global.__mockUser = { uid: 'bird_test_123', capabilities: ['*'] };

    const req = new NextRequest('http://localhost:3000/api/payments/wallet', {
      method: 'POST',
      body: JSON.stringify({
        externalCustomerId: 'cus_stripe_789',
        defaultPaymentMethodId: 'pm_card_999',
      }),
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.userUid).toBe('bird_test_123');
    expect(data.hasActiveWallet).toBe(true);

    // 💥 Vérification de l'invalidation chirurgicale du cache
    expect(revalidateTag).toHaveBeenCalledWith('user-wallet');
    expect(revalidateTag).toHaveBeenCalledWith('user-wallet-bird_test_123');
    expect(revalidateTag).toHaveBeenCalledWith('payment-profile-bird_test_123');
  });
});