import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/ecommerce/products/route';
import { ProductModel } from '@ilot/infrastructure';
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
      return NextResponse.json({ error: "Oiseau non identifié. Dépôt refusé." }, { status: 401 });
    }
    return await handler(req, ctx, mockUser);
  },
}));

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val) => val),
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((cb) => cb),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  ProductModel: {
    find: vi.fn(() => ({
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    })),
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

declare global {
  var __mockUser: any;
}

describe('API Products (Catalogue)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;
  });

  describe('GET /api/products', () => {
    it('🟢 doit récupérer la liste des artefacts avec succès (200)', async () => {
      vi.mocked(ProductModel.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([{ uid: 'prod_1', title: 'Artefact Ancien' }]),
      } as any);

      const req = new Request('http://localhost/api/products');
      const res = await GET(req as any, {});
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toHaveLength(1);
      expect(json[0].uid).toBe('prod_1');
    });
  });

  describe('POST /api/products', () => {
    it('🔴 doit refuser l\'accès (401) si l\'oiseau n\'est pas authentifié', async () => {
      global.__mockUser = undefined;

      const req = new Request('http://localhost/api/products', {
        method: 'POST',
        body: JSON.stringify({ title: 'Nouvel Artefact' })
      });

      const res = await POST(req as any, {});
      expect(res.status).toBe(401);
    });

    it('🟢 doit créer un artefact avec succès (201) et invalider le cache', async () => {
      global.__mockUser = { uid: 'bird_1', capabilities: [] };

      vi.mocked(ProductModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null)
      } as any);

      vi.mocked(ProductModel.create).mockResolvedValueOnce({
        uid: 'prod_new',
        title: 'Nouvel Artefact',
        slug: 'nouvel-artefact'
      } as any);

      const req = new Request('http://localhost/api/products', {
        method: 'POST',
        body: JSON.stringify({ title: 'Nouvel Artefact', storeUid: 'store_1' })
      });

      const res = await POST(req as any, {});
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.uid).toBe('prod_new');
      expect(revalidateTag).toHaveBeenCalledWith('products');
      expect(revalidateTag).toHaveBeenCalledWith('store-products-store_1');
    });
  });
});