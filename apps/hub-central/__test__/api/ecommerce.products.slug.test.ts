import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, DELETE } from '@/app/api/ecommerce/products/[slug]/route';
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
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
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
    findOne: vi.fn(),
    deleteOne: vi.fn(),
  },
}));

vi.mock('@ilot/shared-core', () => ({
  EcommerceOrchestrator: vi.fn().mockImplementation(() => ({
    removeProduct: vi.fn().mockResolvedValue(true),
  })),
}));

declare global {
  var __mockUser: any;
}

describe('API Product [slug] (GET & DELETE)', () => {
  
  beforeEach(() => {
      vi.clearAllMocks();
      global.__mockUser = undefined;
  });  

  describe('GET /api/products/[slug]', () => {
    it('🟢 doit récupérer l\'artefact avec succès (200)', async () => {
      vi.mocked(ProductModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 'prod_1', title: 'Artefact Ancien' })
      } as any);

      const req = new Request('http://localhost/api/products/artefact-ancien');
      const res = await GET(req as any, { params: Promise.resolve({ slug: 'artefact-ancien' }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.uid).toBe('prod_1');
    });

    it('🔴 doit renvoyer 404 si l\'artefact est introuvable', async () => {
      vi.mocked(ProductModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null)
      } as any);

      const req = new Request('http://localhost/api/products/inconnu');
      const res = await GET(req as any, { params: Promise.resolve({ slug: 'inconnu' }) });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/products/[slug]', () => {
    it('🔴 doit refuser l\'accès (401) si l\'oiseau n\'est pas authentifié', async () => {
      global.__mockUser = undefined;

      const req = new Request('http://localhost/api/products/artefact-ancien', { method: 'DELETE' });
      const res = await DELETE(req as any, { params: Promise.resolve({ slug: 'artefact-ancien' }) });

      expect(res.status).toBe(401);
    });

    it('🟢 doit supprimer l\'artefact avec succès (200) et invalider le cache', async () => {
      global.__mockUser = { uid: 'bird_1', capabilities: [] };

      vi.mocked(ProductModel.findOne).mockResolvedValueOnce({
        uid: 'prod_1',
        slug: 'artefact-ancien',
        storeUid: 'store_1'
      } as any);

      const req = new Request('http://localhost/api/products/artefact-ancien', { method: 'DELETE' });
      const res = await DELETE(req as any, { params: Promise.resolve({ slug: 'artefact-ancien' }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(revalidateTag).toHaveBeenCalledWith('products');
      expect(revalidateTag).toHaveBeenCalledWith('product-artefact-ancien');
      expect(revalidateTag).toHaveBeenCalledWith('store-products-store_1');
    });
  });
});