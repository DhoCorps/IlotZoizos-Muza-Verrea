import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/ecommerce/wishlist/route';
import { WishlistModel } from '@ilot/infrastructure';
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
  WishlistModel: {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

declare global {
  var __mockUser: any;
}

describe('API Ecommerce Wishlists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;
  });

  describe('GET /api/ecommerce/wishlist', () => {
    it('🔴 doit refuser l\'accès (401) si l\'oiseau n\'est pas authentifié', async () => {
      global.__mockUser = undefined;

      const req = new Request('http://localhost/api/ecommerce/wishlist');
      const res = await GET(req as any, {});

      expect(res.status).toBe(401);
    });

    it('🟢 doit récupérer les wishlists existantes avec succès (200)', async () => {
      global.__mockUser = { uid: 'bird_1', capabilities: [] };

      vi.mocked(WishlistModel.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ uid: 'wish_1', name: 'Favoris' }])
      } as any);

      const req = new Request('http://localhost/api/ecommerce/wishlist');
      const res = await GET(req as any, {});
      const json = await res.json();

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
      } as any);

      const req = new Request('http://localhost/api/ecommerce/wishlist', {
        method: 'POST',
        body: JSON.stringify({ name: 'Matériel Musique' })
      });

      const res = await POST(req as any, {});
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.uid).toBe('wish_new');
      expect(revalidateTag).toHaveBeenCalledWith('user-wishlists-bird_1');
    });

    it('🟢 doit basculer (toggle) un produit dans une wishlist existante (200)', async () => {
      global.__mockUser = { uid: 'bird_1', capabilities: [] };

      const mockWishlistInstance = {
        uid: 'wish_1',
        userUid: 'bird_1',
        productUids: ['prod_1'],
        save: vi.fn().mockResolvedValue(true)
      };

      vi.mocked(WishlistModel.findOne).mockResolvedValueOnce(mockWishlistInstance as any);

      const req = new Request('http://localhost/api/ecommerce/wishlist', {
        method: 'POST',
        body: JSON.stringify({ wishlistUid: 'wish_1', productUid: 'prod_2' })
      });

      const res = await POST(req as any, {});
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(mockWishlistInstance.productUids).toContain('prod_2');
      expect(mockWishlistInstance.save).toHaveBeenCalled();
      expect(revalidateTag).toHaveBeenCalledWith('user-wishlists-bird_1');
    });
  });
});