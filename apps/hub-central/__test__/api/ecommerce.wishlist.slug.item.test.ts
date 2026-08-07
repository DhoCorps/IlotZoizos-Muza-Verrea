import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DELETE } from '@/app/api/ecommerce/wishlist/[slug]/route';
import { getServerSession } from 'next-auth/next';
import { connectToDatabase, WishlistModel } from '@ilot/infrastructure';

// --- MOCKS DES DÉPENDANCES ---
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn(),
  WishlistModel: {
    findOneAndDelete: vi.fn(),
    updateMany: vi.fn(),
  },
}));

describe('Wishlist Slug DELETE API [slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait retourner 401 si l oiseau n est pas authentifié', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api/ecommerce/wishlist/mon-slug-123', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ slug: 'mon-slug-123' }) });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('Oiseau non identifié.');
  });

  it('devrait dissoudre toute la wishlist si le slug correspond à une liste (200)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'user-bird-1' },
    } as any);

    vi.mocked(WishlistModel.findOneAndDelete).mockResolvedValueOnce({ uid: 'mon-slug-123' } as any);

    const req = new Request('http://localhost/api/ecommerce/wishlist/mon-slug-123', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ slug: 'mon-slug-123' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('dissoute');
    expect(connectToDatabase).toHaveBeenCalledTimes(1);
  });

  it('devrait retirer l artefact des listes si ce n est pas une liste directe (200)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'user-bird-1' },
    } as any);

    vi.mocked(WishlistModel.findOneAndDelete).mockResolvedValueOnce(null);
    vi.mocked(WishlistModel.updateMany).mockResolvedValueOnce({ modifiedCount: 1 } as any);

    const req = new Request('http://localhost/api/ecommerce/wishlist/mon-slug-123', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ slug: 'mon-slug-123' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('retiré');
  });

  it('devrait retourner 404 si l élément est introuvable dans les listes', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'user-bird-1' },
    } as any);

    vi.mocked(WishlistModel.findOneAndDelete).mockResolvedValueOnce(null);
    vi.mocked(WishlistModel.updateMany).mockResolvedValueOnce({ modifiedCount: 0 } as any);

    const req = new Request('http://localhost/api/ecommerce/wishlist/inconnu', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ slug: 'inconnu' }) });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Élément introuvable dans vos listes.');
  });
});