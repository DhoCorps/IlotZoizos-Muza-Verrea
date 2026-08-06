import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DELETE } from '../../app/api/ecommerce/wishlist/[slug]/route';
import { getServerSession } from 'next-auth/next';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

const mockFindOneAndDelete = vi.fn();
const mockUpdateMany = vi.fn();

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  WishlistModel: {
    findOneAndDelete: (...args: any[]) => mockFindOneAndDelete(...args),
    updateMany: (...args: any[]) => mockUpdateMany(...args)
  }
}));

describe('API Ecommerce - Wishlist Item (DELETE /api/ecommerce/wishlist/[itemId])', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('❌ doit rejeter si l’oiseau n’est pas connecté (401)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = new Request('http://localhost:3000/api/ecommerce/wishlist/wish_1', {
      method: 'DELETE'
    });
    const res = await DELETE(req, { params: Promise.resolve({ itemId: 'wish_1' }) });

    expect(res.status).toBe(401);
  });

  it('✅ doit dissoudre toute la wishlist si l’ID correspond à une liste', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'bird_wishlist_owner' }
    } as any);

    mockFindOneAndDelete.mockResolvedValueOnce({ uid: 'wish_1' });

    const req = new Request('http://localhost:3000/api/ecommerce/wishlist/wish_1', {
      method: 'DELETE'
    });
    const res = await DELETE(req, { params: Promise.resolve({ itemId: 'wish_1' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('✅ doit retirer un produit des wishlists si l’ID correspond à un artefact', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'bird_wishlist_owner' }
    } as any);

    mockFindOneAndDelete.mockResolvedValueOnce(null);
    mockUpdateMany.mockResolvedValueOnce({ modifiedCount: 1 });

    const req = new Request('http://localhost:3000/api/ecommerce/wishlist/prod_1', {
      method: 'DELETE'
    });
    const res = await DELETE(req, { params: Promise.resolve({ itemId: 'prod_1' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });
});