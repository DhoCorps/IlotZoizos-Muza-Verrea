import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/ecommerce/wishlist/route';
import { WishlistModel } from '@ilot/infrastructure';
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
    handleRouteError: (error: unknown, defaultMessage: string) => {
      const status = (error as { status?: number }).status || 500;
      const message = (error as { message?: string }).message || defaultMessage;
      return NextResponse.json({ success: false, error: message }, { status });
    }
  };
});

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((cb: Function) => cb),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  WishlistModel: {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

declare global {
  var __mockUser: { [key: string]: unknown; uid: string; capabilities: string[] } | undefined;
}

type RouteHandler = (req: NextRequest, ctx: ApiContext) => Promise<Response>;

describe('API Ecommerce Wishlists', () => {
  const getHandler = GET as unknown as RouteHandler;
  const postHandler = POST as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  describe('GET /api/ecommerce/wishlist', () => {
    it('🔴 doit refuser l\'accès (401) si l\'oiseau n\'est pas authentifié', async () => {
      delete global.__mockUser;

      const req = new NextRequest('http://localhost/api/ecommerce/wishlist');
      const res = await getHandler(req, {} as ApiContext);

      expect(res.status).toBe(401);
    });

    it('🟢 doit récupérer les wishlists existantes avec succès (200)', async () => {
      global.__mockUser = { uid: 'bird_1', capabilities: [] };

      vi.mocked(WishlistModel.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ uid: 'wish_1', name: 'Favoris' }])
      } as unknown as ReturnType<typeof WishlistModel.find>);

      const req = new NextRequest('http://localhost/api/ecommerce/wishlist');
      const res = await getHandler(req, {} as ApiContext);
      const json = await res.json() as { success: boolean; data: Array<{ uid: string }> };

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(1);
    });
  });

  describe('POST /api/ecommerce/wishlist', () => {
    it('🟢 doit créer une nouvelle liste personnalisée (201) et invalider le cache', async () => {
      global.__mockUser = { uid: 'bird_1', capabilities: [] };

      vi.mocked(WishlistModel.create).mockResolvedValueOnce({
        uid: 'wish_new',
        name: 'Matériel Musique',
        productUids: []
      } as unknown as Awaited<ReturnType<typeof WishlistModel.create>>);

      const req = new NextRequest('http://localhost/api/ecommerce/wishlist', {
        method: 'POST',
        body: JSON.stringify({ name: 'Matériel Musique' })
      });

      const res = await postHandler(req, {} as ApiContext);
      const json = await res.json() as { success: boolean; data: { uid: string } };

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.uid).toBe('wish_new');
      expect(revalidateTag).toHaveBeenCalledWith('user-wishlists-bird_1');
      expect(revalidateTag).toHaveBeenCalledWith('wishlists');
      expect(revalidateTag).toHaveBeenCalledWith('ecommerce');
    });

    it('🟢 doit basculer (toggle) un produit dans une wishlist existante (200)', async () => {
      global.__mockUser = { uid: 'bird_1', capabilities: [] };

      const mockWishlistInstance = {
        uid: 'wish_1',
        userUid: 'bird_1',
        productUids: ['prod_1'],
        save: vi.fn().mockResolvedValue(true)
      };

      vi.mocked(WishlistModel.findOne).mockResolvedValueOnce(mockWishlistInstance as unknown as Awaited<ReturnType<typeof WishlistModel.findOne>>);

      const req = new NextRequest('http://localhost/api/ecommerce/wishlist', {
        method: 'POST',
        body: JSON.stringify({ wishlistUid: 'wish_1', productUid: 'prod_2' })
      });

      const res = await postHandler(req, {} as ApiContext);
      const json = await res.json() as { success: boolean };

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(mockWishlistInstance.productUids).toContain('prod_2');
      expect(mockWishlistInstance.save).toHaveBeenCalled();
      expect(revalidateTag).toHaveBeenCalledWith('user-wishlists-bird_1');
      expect(revalidateTag).toHaveBeenCalledWith('wishlists');
      expect(revalidateTag).toHaveBeenCalledWith('ecommerce');
    });
  });
});