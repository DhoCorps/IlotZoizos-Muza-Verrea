import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH } from '@/app/api/ecommerce/orders/[slug]/route'; // Ajuste le chemin selon ton arborescence exacte
import { getServerSession } from 'next-auth/next';
import { connectToDatabase, OrderModel } from '@ilot/infrastructure';

// --- MOCKS DES DÉPENDANCES ---
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn(),
  OrderModel: {
    findOne: vi.fn(),
  },
}));

describe('Order Slug API [GET, PATCH]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/orders/[slug]', () => {
    it('devrait retourner 401 si l oiseau n est pas authentifié', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api/orders/order-123');
      const res = await GET(req, { params: Promise.resolve({ slug: 'order-123' }) });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Oiseau non identifié.');
    });

    it('devrait retourner 404 si la commande est introuvable', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'user-bird-1' },
      } as any);

      vi.mocked(OrderModel.findOne).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(null),
      } as any);

      const req = new Request('http://localhost/api/orders/unknown-order');
      const res = await GET(req, { params: Promise.resolve({ slug: 'unknown-order' }) });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toContain('introuvable');
    });

    it('devrait retourner 403 si l oiseau n est ni le propriétaire ni admin', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'user-bird-2', capabilities: [] },
      } as any);

      const mockOrder = { uid: 'order-123', buyerUid: 'user-bird-1' };
      vi.mocked(OrderModel.findOne).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(mockOrder),
      } as any);

      const req = new Request('http://localhost/api/orders/order-123');
      const res = await GET(req, { params: Promise.resolve({ slug: 'order-123' }) });
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toBe('Accès refusé à cette transaction.');
    });

    it('devrait retourner 200 et la commande si l acheteur accède à sa propre commande', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'user-bird-1' },
      } as any);

      const mockOrder = { uid: 'order-123', buyerUid: 'user-bird-1', status: 'PENDING' };
      vi.mocked(OrderModel.findOne).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(mockOrder),
      } as any);

      const req = new Request('http://localhost/api/orders/order-123');
      const res = await GET(req, { params: Promise.resolve({ slug: 'order-123' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual(mockOrder);
      expect(connectToDatabase).toHaveBeenCalledTimes(1);
    });
  });

  describe('PATCH /api/orders/[slug]', () => {
    it('devrait retourner 401 si non authentifié lors de la mise à jour', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api/orders/order-123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'PAID' }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ slug: 'order-123' }) });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Oiseau non identifié.');
    });

    it('devrait mettre à jour le statut (200) si l admin ou le propriétaire effectue la requête', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'user-bird-1' },
      } as any);

      const mockSave = vi.fn().mockResolvedValueOnce(true);
      const mockOrderDocument = {
        uid: 'order-123',
        buyerUid: 'user-bird-1',
        status: 'PENDING',
        save: mockSave,
      };

      vi.mocked(OrderModel.findOne).mockResolvedValueOnce(mockOrderDocument as any);

      const req = new Request('http://localhost/api/orders/order-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID' }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ slug: 'order-123' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockOrderDocument.status).toBe('PAID');
      expect(mockSave).toHaveBeenCalledTimes(1);
    });
  });
});