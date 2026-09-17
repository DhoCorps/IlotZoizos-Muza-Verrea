import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH } from '@/app/api/ecommerce/orders/[slug]/route';
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
  unstable_cache: vi.fn((cb: Function) => cb),
}));

vi.mock('@/lib/cache/ecommerce.cache', () => ({
  getCachedOrder: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val: string) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
}));

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    connectToDatabase: vi.fn().mockResolvedValue(true),
    OrderModel: {
      findOne: vi.fn(),
    },
    // 🪡 Helper unifié mocké robuste gérant le mode lean et non-lean
    findEntityBySlugOrUid: vi.fn(async (model: { findOne: Function }, identifier: string, options = { lean: true }) => {
      const doc = await model.findOne({ $or: [{ slug: identifier }, { uid: identifier }] });
      if (!doc) return null;
      if (options.lean && typeof doc.lean === 'function') {
        return await doc.lean();
      }
      return doc;
    }),
  };
});

declare global {
  var __mockUser: { [key: string]: unknown; uid: string; capabilities: string[] } | undefined;
}

type RouteHandler = (req: NextRequest, ctx: ApiContext) => Promise<Response>;

describe('API Order [slug] (GET & PATCH)', () => {
  const getHandler = GET as unknown as RouteHandler;
  const patchHandler = PATCH as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  describe('GET /api/orders/[slug]', () => {
    it('🔴 doit refuser l\'accès (401) si l\'oiseau n\'est pas authentifié', async () => {
      delete global.__mockUser;

      const req = new NextRequest('http://localhost/api/orders/ord_123');
      const res = await getHandler(req, { params: Promise.resolve({ slug: 'ord_123' }) });

      expect(res.status).toBe(401);
    });

    it('🟢 doit récupérer la commande avec succès (200) si l\'acheteur est propriétaire', async () => {
      global.__mockUser = { uid: 'bird_1', capabilities: [] };

      vi.mocked(OrderModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 'ord_123', buyerUid: 'bird_1', status: 'PAID' })
      } as unknown as ReturnType<typeof OrderModel.findOne>);

      const req = new NextRequest('http://localhost/api/orders/ord_123');
      const res = await getHandler(req, { params: Promise.resolve({ slug: 'ord_123' }) });
      const json = await res.json() as { uid: string };

      expect(res.status).toBe(200);
      expect(json.uid).toBe('ord_123');
    });

    it('🔴 doit refuser l\'accès (403) si l\'oiseau n\'est ni propriétaire ni admin', async () => {
      global.__mockUser = { uid: 'bird_2', capabilities: [] };

      vi.mocked(OrderModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 'ord_123', buyerUid: 'bird_1', status: 'PAID' })
      } as unknown as ReturnType<typeof OrderModel.findOne>);

      const req = new NextRequest('http://localhost/api/orders/ord_123');
      const res = await getHandler(req, { params: Promise.resolve({ slug: 'ord_123' }) });

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

      // Pour la route PATCH (lean: false), findOne retourne directement le document Mongoose (mockOrderDoc)
      vi.mocked(OrderModel.findOne).mockResolvedValueOnce(mockOrderDoc as unknown as Awaited<ReturnType<typeof OrderModel.findOne>>);

      const req = new NextRequest('http://localhost/api/orders/ord_123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'COMPLETED' })
      });

      const res = await patchHandler(req, { params: Promise.resolve({ slug: 'ord_123' }) });
      const json = await res.json() as { success: boolean };

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