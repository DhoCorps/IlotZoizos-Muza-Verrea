// apps/hub-central/__test__/api/ecommerce.wishlist.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  WishlistModel: {
    findOne: vi.fn().mockImplementation((query) => {
      if (query.userUid === 'bird-alpha') {
        return Promise.resolve({
          uid: 'wish-1',
          userUid: 'bird-alpha',
          productUids: ['prod-1'],
          save: vi.fn().mockResolvedValue(true)
        });
      }
      return Promise.resolve(null);
    }),
    create: vi.fn().mockImplementation((data) => Promise.resolve({ ...data, _id: 'mock_id' }))
  }
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn().mockResolvedValue({
    user: { uid: 'bird-alpha', name: 'Albatros', capabilities: ['*'] }
  })
}));

import { GET, POST } from '../../app/api/ecommerce/wishlist/route';

describe('API Ecommerce Wishlist (/api/ecommerce/wishlist)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit récupérer la wishlist de l’Oiseau connecté (GET)', async () => {
    const req = new Request('http://localhost/api/ecommerce/wishlist');
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.productUids).toContain('prod-1');
  });

  it('🟢 doit ajouter un artefact à sa wishlist (POST)', async () => {
    const req = new Request('http://localhost/api/ecommerce/wishlist', {
      method: 'POST',
      body: JSON.stringify({
        productUid: 'prod-2'
      })
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });
});