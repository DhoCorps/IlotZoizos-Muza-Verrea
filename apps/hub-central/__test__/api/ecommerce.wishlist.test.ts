// apps/hub-central/__test__/api/ecommerce.wishlist.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  WishlistModel: {
    find: vi.fn().mockReturnValue({
      lean: () => Promise.resolve([
        { uid: 'wish_1', userUid: 'bird-alpha', name: 'Favoris Principaux', productUids: ['prod_1'] }
      ])
    }),
    findOne: vi.fn().mockResolvedValue({
      uid: 'wish_1',
      userUid: 'bird-alpha',
      productUids: ['prod_1'],
      save: vi.fn().mockResolvedValue(true)
    }),
    create: vi.fn().mockImplementation((doc) => Promise.resolve({ ...doc, toObject: () => doc }))
  }
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn().mockResolvedValue({
    user: { uid: 'bird-alpha' }
  })
}));

import { GET, POST } from '../../app/api/ecommerce/wishlist/route';

describe('💖 Wishlist API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit récupérer les wishlists de l’Oiseau', async () => {
    const req = new Request('http://localhost/api/ecommerce/wishlist');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });
});