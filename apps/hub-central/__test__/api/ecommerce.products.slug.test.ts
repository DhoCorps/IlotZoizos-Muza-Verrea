import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, DELETE } from '@/app/api/ecommerce/products/[slug]/route';
import { ProductModel } from '@ilot/infrastructure';
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
    withSilice: (handler: unknown) => handler,
    withAura: (handler: unknown) => async (req: NextRequest, ctx: ApiContext) => {
      const mockUser = global.__mockUser;
      if (!mockUser || !mockUser.uid) {
        return NextResponse.json({ success: false, error: "Oiseau non identifié." }, { status: 401 });
      }
      // @ts-ignore
      return await handler(req, ctx, mockUser);
    },
    assertEntitySovereignty: (user: { uid: string; capabilities?: string[] }, ownerUid?: string) => {
      const isArchitect = user.capabilities?.includes('*');
      if (!isArchitect && (!ownerUid || user.uid !== ownerUid)) {
        throw new (class extends Error {
          status = 403;
          constructor(m: string) { super(m); }
        })("Souveraineté violée.");
      }
    },
    handleRouteError: (error: unknown, defaultMessage: string) => {
      const status = (error as { status?: number }).status || 500;
      const message = (error as { message?: string }).message || defaultMessage;
      return NextResponse.json({ success: false, error: message }, { status });
    }
  };
});

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val: string) => val),
}));

vi.mock('@/lib/cache/ecommerce.cache', () => ({
  getCachedProduct: vi.fn().mockResolvedValue(null),
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((cb: Function) => cb),
}));

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    connectToDatabase: vi.fn().mockResolvedValue(true),
    ProductModel: {
      findOne: vi.fn(),
      deleteOne: vi.fn(),
    },
    // Mock du helper unifié s'appuyant sur ProductModel.findOne
    findEntityBySlugOrUid: vi.fn(async (model: { findOne: Function }, identifier: string) => {
      const doc = await model.findOne({ $or: [{ slug: identifier }, { uid: identifier }] });
      if (!doc) return null;
      if (typeof doc.lean === 'function') {
        return await doc.lean();
      }
      return doc;
    }),
  };
});

vi.mock('@ilot/shared-core', () => ({
  EcommerceOrchestrator: vi.fn().mockImplementation(() => ({
    removeProduct: vi.fn().mockResolvedValue(true),
  })),
}));

declare global {
  var __mockUser: { [key: string]: unknown; uid: string; capabilities: string[] } | undefined;
}

type RouteHandler = (req: NextRequest, ctx: ApiContext) => Promise<Response>;

describe('API Product [slug] (GET & DELETE)', () => {
  const getHandler = GET as unknown as RouteHandler;
  const deleteHandler = DELETE as unknown as RouteHandler;
  
  beforeEach(() => {
      vi.clearAllMocks();
      delete global.__mockUser;
  });  

  describe('GET /api/products/[slug]', () => {
    it('🟢 doit récupérer l\'artefact avec succès (200) avec en-tête CDN SEO', async () => {
      vi.mocked(ProductModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 'prod_1', title: 'Artefact Ancien' })
      } as unknown as ReturnType<typeof ProductModel.findOne>);

      const req = new NextRequest('http://localhost/api/products/artefact-ancien');
      const res = await getHandler(req, { params: Promise.resolve({ slug: 'artefact-ancien' }) });
      const json = await res.json() as { uid: string };

      expect(res.status).toBe(200);
      expect(json.uid).toBe('prod_1');
      expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=60, stale-while-revalidate=300'); // 🚀 Vérification SEO CDN
    });

    it('🔴 doit renvoyer 404 si l\'artefact est introuvable', async () => {
      vi.mocked(ProductModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null)
      } as unknown as ReturnType<typeof ProductModel.findOne>);

      const req = new NextRequest('http://localhost/api/products/inconnu');
      const res = await getHandler(req, { params: Promise.resolve({ slug: 'inconnu' }) });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/products/[slug]', () => {
    it('🔴 doit refuser l\'accès (401) si l\'oiseau n\'est pas authentifié', async () => {
      delete global.__mockUser;

      const req = new NextRequest('http://localhost/api/products/artefact-ancien', { method: 'DELETE' });
      const res = await deleteHandler(req, { params: Promise.resolve({ slug: 'artefact-ancien' }) });

      expect(res.status).toBe(401);
    });

    it('🟢 doit supprimer l\'artefact avec succès (200) et invalider le cache', async () => {
      global.__mockUser = { uid: 'bird_1', capabilities: [] };

      vi.mocked(ProductModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          uid: 'prod_1',
          slug: 'artefact-ancien',
          storeUid: 'store_1',
          ownerUid: 'bird_1'
        })
      } as unknown as ReturnType<typeof ProductModel.findOne>);

      const req = new NextRequest('http://localhost/api/products/artefact-ancien', { method: 'DELETE' });
      const res = await deleteHandler(req, { params: Promise.resolve({ slug: 'artefact-ancien' }) });
      const json = await res.json() as { success: boolean };

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(revalidateTag).toHaveBeenCalledWith('products');
      expect(revalidateTag).toHaveBeenCalledWith('product-artefact-ancien');
      expect(revalidateTag).toHaveBeenCalledWith('store-products-store_1');
    });
  });
});