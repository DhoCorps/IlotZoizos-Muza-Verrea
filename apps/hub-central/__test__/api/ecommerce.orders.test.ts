import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/ecommerce/orders/route';
import { OrderModel } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, ctx: any) => {
    const mockUser = global.__mockUser;
    if (!mockUser || !mockUser.uid) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }
    return await handler(req, ctx, mockUser);
  },
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  OrderModel: {
    create: vi.fn(),
  },
}));

declare global {
  var __mockUser: any;
}

describe('API Orders (Commandes)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;
  });

  it('🔴 [POST] doit refuser l\'accès (401) si l\'oiseau n\'est pas authentifié', async () => {
    global.__mockUser = undefined;

    const req = new Request('http://localhost/api/orders', {
      method: 'POST',
      body: JSON.stringify({ items: [], totalAmount: 50 })
    });

    const res = await POST(req as any, {});
    expect(res.status).toBe(401);
  });

  it('🔴 [POST] doit rejeter (400) si le corps de la requête est malformé', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };

    // Corps invalide (pas de JSON valide)
    const req = new Request('http://localhost/api/orders', {
      method: 'POST',
      body: 'invalid-json'
    });
    // On simule un échec de req.json()
    req.json = vi.fn().mockRejectedValue(new Error('Invalid JSON'));

    const res = await POST(req as any, {});
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('illisible ou malformé');
  });

  it('🟢 [POST] doit sédimenter la commande avec succès (201) et invalider le cache', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };

    vi.mocked(OrderModel.create).mockResolvedValueOnce({
      uid: 'ord_test_123',
      buyerUid: 'bird_1',
      totalAmount: 120,
      status: 'PAID'
    } as any);

    const req = new Request('http://localhost/api/orders', {
      method: 'POST',
      body: JSON.stringify({ items: [{ id: 'prod_1' }], totalAmount: 120, currency: 'EUR' })
    });

    const res = await POST(req as any, {});
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.uid).toBe('ord_test_123');
    expect(revalidateTag).toHaveBeenCalledWith('orders');
    expect(revalidateTag).toHaveBeenCalledWith('user-orders-bird_1');
  });
});