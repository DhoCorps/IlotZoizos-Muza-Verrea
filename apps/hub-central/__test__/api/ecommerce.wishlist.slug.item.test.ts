import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DELETE } from '@/app/api/ecommerce/wishlist/[slug]/route';
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

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val) => val),
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  WishlistModel: {
    findOneAndDelete: vi.fn(),
    updateMany: vi.fn(),
  },
}));

declare global {
  var __mockUser: any;
}

describe('API Ecommerce Wishlist DELETE [slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;
  });

  it('🔴 doit refuser l\'accès (401) si l\'oiseau n\'est pas authentifié', async () => {
    global.__mockUser = undefined;

    const req = new Request('http://localhost/api/ecommerce/wishlist/mon-slug', { method: 'DELETE' });
    const res = await DELETE(req as any, { params: Promise.resolve({ slug: 'mon-slug' }) });

    expect(res.status).toBe(401);
  });

  it('🟢 doit dissoudre une wishlist avec succès (200) si le slug correspond à une liste', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };

    vi.mocked(WishlistModel.findOneAndDelete).mockResolvedValueOnce({ uid: 'mon-slug' } as any);

    const req = new Request('http://localhost/api/ecommerce/wishlist/mon-slug', { method: 'DELETE' });
    const res = await DELETE(req as any, { params: Promise.resolve({ slug: 'mon-slug' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(revalidateTag).toHaveBeenCalledWith('user-wishlists-bird_1');
    expect(revalidateTag).toHaveBeenCalledWith('wishlists');
  });

  it('🟢 doit retirer un produit des wishlists (200) si ce n\'est pas une liste', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };

    vi.mocked(WishlistModel.findOneAndDelete).mockResolvedValueOnce(null);
    vi.mocked(WishlistModel.updateMany).mockResolvedValueOnce({ modifiedCount: 1 } as any);

    const req = new Request('http://localhost/api/ecommerce/wishlist/mon-produit', { method: 'DELETE' });
    const res = await DELETE(req as any, { params: Promise.resolve({ slug: 'mon-produit' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(revalidateTag).toHaveBeenCalledWith('user-wishlists-bird_1');
  });

  it('🔴 doit renvoyer 404 si l\'élément est introuvable', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };

    vi.mocked(WishlistModel.findOneAndDelete).mockResolvedValueOnce(null);
    vi.mocked(WishlistModel.updateMany).mockResolvedValueOnce({ modifiedCount: 0 } as any);

    const req = new Request('http://localhost/api/ecommerce/wishlist/inconnu', { method: 'DELETE' });
    const res = await DELETE(req as any, { params: Promise.resolve({ slug: 'inconnu' }) });

    expect(res.status).toBe(404);
  });
});