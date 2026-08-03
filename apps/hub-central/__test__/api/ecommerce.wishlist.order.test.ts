// apps/hub-central/__test__/api/ecommerce.wishlist.order.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getWishlists } from '../../app/api/ecommerce/wishlist/route';
import { POST as createOrder } from '../../app/api/ecommerce/orders/route';
import { getServerSession } from 'next-auth/next';

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  WishlistModel: {
    find: vi.fn().mockReturnValue({
      lean: () => Promise.resolve([])
    }),
    create: vi.fn().mockImplementation((doc) => Promise.resolve({
      ...doc,
      toObject: () => doc
    }))
  },
  OrderModel: {
    create: vi.fn().mockImplementation((doc) => Promise.resolve({ ...doc, _id: 'mock_order_id' }))
  }
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

describe('💖 Wishlists & 📦 Orders API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/ecommerce/wishlist', () => {
    it('doit créer une wishlist par défaut si aucune n’existe', async () => {
      (getServerSession as any).mockResolvedValue({ user: { uid: 'oiseau_1' } });
      
      const req = new Request('http://localhost/api/ecommerce/wishlist');
      const res = await getWishlists(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data[0].name).toBe('Favoris Principaux');
    });
  });

  describe('POST /api/ecommerce/orders', () => {
    it('doit sédimenter une commande payée avec succès', async () => {
      const orderPayload = {
        buyerUid: 'oiseau_1',
        items: [{ productUid: 'prod_1', title: 'Parchemin', quantity: 1, pricePaid: 1000, currency: 'EUR' }],
        totalAmount: 1000,
        currency: 'EUR'
      };

      const req = new Request('http://localhost/api/ecommerce/orders', {
        method: 'POST',
        body: JSON.stringify(orderPayload)
      });

      const res = await createOrder(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.message).toContain("Commande sédimentée");
    });
  });
});