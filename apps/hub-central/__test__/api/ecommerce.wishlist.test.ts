import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../../app/api/ecommerce/wishlist/route';
import { getServerSession } from 'next-auth/next';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

const mockFind = vi.fn();
const mockFindOne = vi.fn();
const mockCreate = vi.fn();

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  WishlistModel: {
    find: (...args: any[]) => ({
      lean: () => mockFind(...args)
    }),
    findOne: (...args: any[]) => mockFindOne(...args),
    create: (...args: any[]) => mockCreate(...args)
  }
}));

describe('API Ecommerce - Wishlist Principal (GET / POST /api/ecommerce/wishlist)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('❌ GET : doit rejeter si l’oiseau n’est pas connecté (401)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = new Request('http://localhost:3000/api/ecommerce/wishlist');
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it('✅ GET : doit retourner les wishlists de l’utilisateur ou en créer une par défaut', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'bird_user_1' }
    } as any);

    mockFind.mockResolvedValueOnce([{ uid: 'wish_1', name: 'Favoris Principaux' }]);

    const req = new Request('http://localhost:3000/api/ecommerce/wishlist');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.length).toBe(1);
  });

  it('✅ POST : doit basculer (toggle) un produit dans la wishlist (200)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'bird_user_1' }
    } as any);

    const mockWishlistInstance = {
      uid: 'wish_1',
      productUids: [],
      save: vi.fn().mockResolvedValue(true)
    };

    mockFindOne.mockResolvedValueOnce(mockWishlistInstance);

    const req = new Request('http://localhost:3000/api/ecommerce/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productUid: 'prod_99' })
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockWishlistInstance.productUids).toContain('prod_99');
    expect(mockWishlistInstance.save).toHaveBeenCalled();
  });
});