import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DELETE } from '@/app/api/ecommerce/wishlist/[slug]/route';
import { WishlistModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
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

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    connectToDatabase: vi.fn().mockResolvedValue(true),
    WishlistModel: {
      deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }),
      updateMany: vi.fn(),
    },
    // 🛡️ Protocole appliqué : Mock du helper unifié centralisé
    findEntityBySlugOrUid: vi.fn(),
  };
});

declare global {
  var __mockUser: { [key: string]: unknown; uid: string; capabilities: string[] } | undefined;
}

type RouteHandler = (req: NextRequest, ctx: ApiContext) => Promise<Response>;

describe('API Ecommerce Wishlist DELETE [slug]', () => {
  const deleteHandler = DELETE as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  it('🔴 doit refuser l\'accès (401) si l\'oiseau n\'est pas authentifié', async () => {
    delete global.__mockUser;

    const req = new NextRequest('http://localhost/api/ecommerce/wishlist/mon-slug', { method: 'DELETE' });
    const res = await deleteHandler(req, { params: Promise.resolve({ slug: 'mon-slug' }) });

    expect(res.status).toBe(401);
  });

  it('🟢 doit dissoudre une wishlist avec succès (200) si le slug correspond à une liste', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };

    // Simulation de la résolution unifiée
    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ 
      uid: 'mon-slug', 
      slug: 'mon-slug', 
      userUid: 'bird_1' 
    } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

    const req = new NextRequest('http://localhost/api/ecommerce/wishlist/mon-slug', { method: 'DELETE' });
    const res = await deleteHandler(req, { params: Promise.resolve({ slug: 'mon-slug' }) });
    const json = await res.json() as { success: boolean };

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(findEntityBySlugOrUid).toHaveBeenCalledWith(WishlistModel, 'mon-slug');
    expect(WishlistModel.deleteOne).toHaveBeenCalledWith({ uid: 'mon-slug' });
    expect(revalidateTag).toHaveBeenCalledWith('user-wishlists-bird_1');
    expect(revalidateTag).toHaveBeenCalledWith('wishlists');
    expect(revalidateTag).toHaveBeenCalledWith('ecommerce');
  });

  it('🟢 doit retirer un produit des wishlists (200) si ce n\'est pas une liste', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(null);
    vi.mocked(WishlistModel.updateMany).mockResolvedValueOnce({ modifiedCount: 1 } as unknown as Awaited<ReturnType<typeof WishlistModel.updateMany>>);

    const req = new NextRequest('http://localhost/api/ecommerce/wishlist/mon-produit', { method: 'DELETE' });
    const res = await deleteHandler(req, { params: Promise.resolve({ slug: 'mon-produit' }) });
    const json = await res.json() as { success: boolean };

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(findEntityBySlugOrUid).toHaveBeenCalledWith(WishlistModel, 'mon-produit');
    expect(WishlistModel.updateMany).toHaveBeenCalledWith(
      { userUid: 'bird_1' },
      { $pull: { productUids: 'mon-produit' } }
    );
    expect(revalidateTag).toHaveBeenCalledWith('user-wishlists-bird_1');
    expect(revalidateTag).toHaveBeenCalledWith('ecommerce');
  });

  it('🔴 doit renvoyer 404 si l\'élément est introuvable', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(null);
    vi.mocked(WishlistModel.updateMany).mockResolvedValueOnce({ modifiedCount: 0 } as unknown as Awaited<ReturnType<typeof WishlistModel.updateMany>>);

    const req = new NextRequest('http://localhost/api/ecommerce/wishlist/inconnu', { method: 'DELETE' });
    const res = await deleteHandler(req, { params: Promise.resolve({ slug: 'inconnu' }) });

    expect(res.status).toBe(404);
  });
});