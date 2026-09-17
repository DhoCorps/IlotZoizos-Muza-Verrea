import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/ecommerce/orders/route';
import { OrderModel } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { NextResponse, NextRequest } from 'next/server';
import type { ApiContext } from '@/lib/api-guards';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-guards')>();
  return {
    ...actual,
    withAura: (handler: unknown) => async (req: NextRequest, ctx: ApiContext) => {
      const mockUser = global.__mockUser;
      if (!mockUser || !mockUser.uid) {
        return NextResponse.json({ success: false, error: "Oiseau non identifié." }, { status: 401 });
      }
      // @ts-ignore
      return await handler(req, ctx, mockUser);
    },
  };
});

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
  var __mockUser: { [key: string]: unknown; uid: string; capabilities: string[] } | undefined;
}

type RouteHandler = (req: NextRequest, ctx: ApiContext) => Promise<Response>;

describe('API Orders (Commandes)', () => {
  const postHandler = POST as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  it('🔴 [POST] doit refuser l\'accès (401) si l\'oiseau n\'est pas authentifié', async () => {
    delete global.__mockUser;

    const req = new NextRequest('http://localhost/api/orders', {
      method: 'POST',
      body: JSON.stringify({ items: [], totalAmount: 50 })
    });

    const res = await postHandler(req, {} as ApiContext);
    expect(res.status).toBe(401);
  });

  it('🔴 [POST] doit rejeter (400) si le corps de la requête est malformé', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };

    // Corps invalide (pas de JSON valide)
    const req = new NextRequest('http://localhost/api/orders', {
      method: 'POST',
      body: 'invalid-json'
    });
    // On simule un échec de req.json()
    req.json = vi.fn().mockRejectedValue(new Error('Invalid JSON'));

    const res = await postHandler(req, {} as ApiContext);
    const json = await res.json() as { success: boolean; error: string };

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
    } as unknown as Awaited<ReturnType<typeof OrderModel.create>>);

    const req = new NextRequest('http://localhost/api/orders', {
      method: 'POST',
      body: JSON.stringify({ items: [{ productUid: 'prod_1' }], totalAmount: 120, currency: 'EUR' })
    });

    const res = await postHandler(req, {} as ApiContext);
    const json = await res.json() as { success: boolean; data: { uid: string } };

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.uid).toBe('ord_test_123');
    expect(OrderModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        buyerUid: 'bird_1',
        totalAmount: 120,
        status: 'PAID'
      })
    );
    expect(revalidateTag).toHaveBeenCalledWith('orders');
    expect(revalidateTag).toHaveBeenCalledWith('ecommerce');
    expect(revalidateTag).toHaveBeenCalledWith('user-orders-bird_1');
  });
});