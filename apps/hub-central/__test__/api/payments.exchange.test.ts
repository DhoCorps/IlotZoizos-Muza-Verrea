// apps/hub-central/__test__/api/payments.exchange.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/payments/exchange/route';
import { getServerSession } from 'next-auth/next';
import { KomptaPaymentOrchestrator } from '@ilot/shared-core';

// 1. Mock de NextAuth pour contrôler la session utilisateur
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

// 2. Mock de l'orchestrateur Kompta pour simuler executeItemExchange
vi.mock('@ilot/shared-core', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    KomptaPaymentOrchestrator: vi.fn().mockImplementation(() => ({
      executeItemExchange: vi.fn().mockResolvedValue({
        success: true,
        exchangeUid: 'ex_test_123',
        offeredItemUid: 'item_font_letrin',
      }),
    })),
  };
});

describe('API Payments Exchange - POST /api/payments/exchange', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('doit rejeter (401) si l\'oiseau n\'est pas authentifié', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = new Request('http://localhost:3000/api/payments/exchange', {
      method: 'POST',
      body: JSON.stringify({
        recipientUid: 'bird_recipient_456',
        offeredItemUid: 'item_font_letrin',
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Oiseau non authentifié');
  });

  it('doit rejeter (400) si les paramètres d\'échange (recipientUid ou offeredItemUid) sont manquants', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { name: 'Oiseau Donateur', email: 'sender@ilot.fr', uid: 'bird_sender_123' },
    } as any);

    const req = new Request('http://localhost:3000/api/payments/exchange', {
      method: 'POST',
      body: JSON.stringify({
        recipientUid: 'bird_recipient_456',
        // Manque offeredItemUid
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Paramètres d\'échange manquants');
  });

  it('doit réussir (201) et enregistrer le troc d\'objet via le Chapeau', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { name: 'Oiseau Donateur', email: 'sender@ilot.fr', uid: 'bird_sender_123' },
    } as any);

    const req = new Request('http://localhost:3000/api/payments/exchange', {
      method: 'POST',
      body: JSON.stringify({
        exchangeUid: 'ex_test_123',
        recipientUid: 'bird_recipient_456',
        offeredItemUid: 'item_font_letrin',
        targetTitle: 'Partition Partita',
        description: 'Troc police contre partition',
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.exchangeUid).toBe('ex_test_123');
    expect(data.offeredItemUid).toBe('item_font_letrin');
  });
});