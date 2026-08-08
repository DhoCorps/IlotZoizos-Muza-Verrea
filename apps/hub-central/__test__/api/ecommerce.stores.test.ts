import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/ecommerce/stores/route'; // Ajuste le chemin selon ton arborescence
import { StoreModel } from '@ilot/infrastructure';
import { EcommerceOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', () => ({
  withSilice: (handler: any) => handler,
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
  StoreModel: {
    find: vi.fn(() => ({
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    })),
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('@ilot/shared-core', () => ({
  EcommerceOrchestrator: vi.fn().mockImplementation(() => ({
    createStore: vi.fn().mockResolvedValue(true),
  })),
}));

declare global {
  var __mockUser: any;
}

describe('API Stores (Boutiques)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;
  });

  describe('GET /api/stores', () => {
    it('🟢 [GET] doit récupérer la liste des boutiques vérifiées avec succès (200)', async () => {
      vi.mocked(StoreModel.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([{ uid: 'store_1', storeName: 'Boutique Test' }]),
      } as any);

      const req = new Request('http://localhost/api/stores');
      const res = await GET(req as any, {});
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toHaveLength(1);
      expect(json[0].uid).toBe('store_1');
    });
  });

  describe('POST /api/stores', () => {
    it('🔴 [POST] doit refuser l\'accès (401) si l\'oiseau n\'est pas authentifié', async () => {
      global.__mockUser = undefined;

      const req = new Request('http://localhost/api/stores', {
        method: 'POST',
        body: JSON.stringify({ storeName: 'Boutique Inconnue' })
      });

      const res = await POST(req as any, {});
      expect(res.status).toBe(401);
    });

    it('🟢 [POST] doit créer une boutique avec succès (201) et invalider le cache', async () => {
      global.__mockUser = { uid: 'bird_1', capabilities: [] };

      vi.mocked(StoreModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null) // Pas de collision de slug
      } as any);

      vi.mocked(StoreModel.create).mockResolvedValueOnce({
        uid: 'store_new',
        storeName: 'Canopée Shop',
        slug: 'canopee-shop'
      } as any);

      const req = new Request('http://localhost/api/stores', {
        method: 'POST',
        body: JSON.stringify({ storeName: 'Canopée Shop', stripeAccountId: 'acct_test' })
      });

      const res = await POST(req as any, {});
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.uid).toBe('store_new');
      expect(revalidateTag).toHaveBeenCalledWith('stores');
      expect(revalidateTag).toHaveBeenCalledWith('verified-stores');
    });
  });
});