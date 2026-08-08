import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH } from '@/app/api/ecommerce/orders/[slug]/route';
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
  unstable_cache: vi.fn((cb) => cb),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  OrderModel: {
    findOne: vi.fn(),
  },
}));

declare global {
  var __mockUser: any;
}

describe('API Order [slug] (GET & PATCH)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;
  });

  describe('GET /api/orders/[slug]', () => {
    it('🔴 doit refuser l\'accès (401) si l\'oiseau n\'est pas authentifié', async () => {
      global.__mockUser = undefined;

      const req = new Request('http://localhost/api/orders/ord_123');
      const res = await GET(req as any, { params: Promise.resolve({ slug: 'ord_123' }) });

      expect(res.status).toBe(401);
    });

    it('🟢 doit récupérer la commande avec succès (200) si l\'acheteur est propriétaire', async () => {
      global.__mockUser = { uid: 'bird_1', capabilities: [] };

      vi.mocked(OrderModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 'ord_123', buyerUid: 'bird_1', status: 'PAID' })
      } as any);

      const req = new Request('http://localhost/api/orders/ord_123');
      const res = await GET(req as any, { params: Promise.resolve({ slug: 'ord_123' }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.uid).toBe('ord_123');
    });

    it('🔴 doit refuser l\'accès (403) si l\'oiseau n\'est ni propriétaire ni admin', async () => {
      global.__mockUser = { uid: 'bird_2', capabilities: [] };

      vi.mocked(OrderModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 'ord_123', buyerUid: 'bird_1', status: 'PAID' })
      } as any);

      const req = new Request('http://localhost/api/orders/ord_123');
      const res = await GET(req as any, { params: Promise.resolve({ slug: 'ord_123' }) });

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/orders/[slug]', () => {
    it('🟢 doit mettre à jour le statut avec succès (200) et invalider le cache', async () => {
      global.__mockUser = { uid: 'bird_1', capabilities: [] };

      const mockOrderDoc = {
        uid: 'ord_123',
        buyerUid: 'bird_1',
        status: 'PAID',
        save: vi.fn().mockResolvedValue(true)
      };

      vi.mocked(OrderModel.findOne).mockResolvedValueOnce(mockOrderDoc as any);

      const req = new Request('http://localhost/api/orders/ord_123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'COMPLETED' })
      });

      const res = await PATCH(req as any, { params: Promise.resolve({ slug: 'ord_123' }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(mockOrderDoc.status).toBe('COMPLETED');
      expect(mockOrderDoc.save).toHaveBeenCalled();
      expect(revalidateTag).toHaveBeenCalledWith('orders');
      expect(revalidateTag).toHaveBeenCalledWith('order-ord_123');
      expect(revalidateTag).toHaveBeenCalledWith('user-orders-bird_1');
    });
  });
});