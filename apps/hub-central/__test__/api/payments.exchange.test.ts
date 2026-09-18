import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/payments/exchange/route';
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

describe('API Payments Exchange - POST /api/payments/exchange', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
    
    // 🛡️ SUTURE CHIRURGICALE : Espionnage direct de la méthode de l'orchestrateur
    vi.spyOn(KomptaPaymentOrchestrator.prototype, 'executeItemExchange').mockResolvedValue({
      success: true,
      exchangeUid: 'ex_test_123',
      offeredItemUid: 'item_font_letrin',
    } as unknown as Awaited<ReturnType<KomptaPaymentOrchestrator['executeItemExchange']>>);
  });

  it('doit rejeter (401) si l\'oiseau n\'est pas authentifié', async () => {
    delete global.__mockUser;

    const req = new NextRequest('http://localhost:3000/api/payments/exchange', {
      method: 'POST',
      body: JSON.stringify({
        recipientUid: 'bird_recipient_456',
        offeredItemUid: 'item_font_letrin',
      }),
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Le Nexus est invisible aux étrangers.");
  });

  it('doit rejeter (400) si les paramètres d\'échange (recipientUid ou offeredItemUid) sont manquants', async () => {
    global.__mockUser = { uid: 'bird_sender_123', capabilities: [] };

    const req = new NextRequest('http://localhost:3000/api/payments/exchange', {
      method: 'POST',
      body: JSON.stringify({
        recipientUid: 'bird_recipient_456',
        // Manque offeredItemUid
      }),
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Paramètres d\'échange manquants');
  });

  it('doit réussir (201), enregistrer le troc via le Chapeau et invalider le cache', async () => {
    global.__mockUser = { uid: 'bird_sender_123', capabilities: [] };

    const req = new NextRequest('http://localhost:3000/api/payments/exchange', {
      method: 'POST',
      body: JSON.stringify({
        exchangeUid: 'ex_test_123',
        recipientUid: 'bird_recipient_456',
        offeredItemUid: 'item_font_letrin',
        targetTitle: 'Partition Partita',
        description: 'Troc police contre partition',
      }),
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.exchangeUid).toBe('ex_test_123');
    expect(data.offeredItemUid).toBe('item_font_letrin');

    // 💥 Vérification de l'invalidation chirurgicale du cache
    expect(revalidateTag).toHaveBeenCalledWith('barter-offers');
    expect(revalidateTag).toHaveBeenCalledWith('user-inventory-bird_sender_123');
    expect(revalidateTag).toHaveBeenCalledWith('user-inventory-bird_recipient_456');
  });
});