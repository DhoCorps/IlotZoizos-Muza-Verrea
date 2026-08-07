import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH } from '@/app/api/ecommerce/barter/[slug]/route';
import { getServerSession } from 'next-auth/next';
import { connectToDatabase, BarterOfferModel } from '@ilot/infrastructure';
import { EcommerceOrchestrator } from '@ilot/shared-core';

// --- MOCKS ---
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  BarterOfferModel: {
    findOne: vi.fn(),
  },
}));

vi.mock('@ilot/shared-core', () => ({
  EcommerceOrchestrator: vi.fn().mockImplementation(() => ({
    resolveBarter: vi.fn(),
  })),
}));

describe('Ecommerce Barter Slug API [GET, PATCH]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/ecommerce/barter/[slug]', () => {
    it('devrait retourner 200 et l offre de troc si elle existe', async () => {
      const mockBarter = { uid: 'barter-123', title: 'Troc de graines' };
      vi.mocked(BarterOfferModel.findOne).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(mockBarter),
      } as any);

      const req = new Request('http://localhost/api/ecommerce/barter/barter-123');
      const res = await GET(req, { params: Promise.resolve({ slug: 'barter-123' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual(mockBarter);
      expect(BarterOfferModel.findOne).toHaveBeenCalledWith({ uid: 'barter-123' });
      expect(connectToDatabase).toHaveBeenCalledTimes(1);
    });

    it('devrait retourner 404 si l offre est introuvable', async () => {
      vi.mocked(BarterOfferModel.findOne).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(null),
      } as any);

      const req = new Request('http://localhost/api/ecommerce/barter/inconnu');
      const res = await GET(req, { params: Promise.resolve({ slug: 'inconnu' }) });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toContain('introuvable');
    });

    it('devrait retourner 500 si la Silice est injoignable', async () => {
      vi.mocked(connectToDatabase).mockRejectedValueOnce(new Error('DB Down'));

      const req = new Request('http://localhost/api/ecommerce/barter/barter-123');
      const res = await GET(req, { params: Promise.resolve({ slug: 'barter-123' }) });
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toContain('La Silice est injoignable');
    });
  });

  describe('PATCH /api/ecommerce/barter/[slug]', () => {
    it('devrait retourner 401 si l oiseau n est pas authentifié', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api/ecommerce/barter/barter-123', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'ACCEPT' }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ slug: 'barter-123' }) });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('Oiseau non identifié');
    });

    it('devrait réussir (200) et résoudre le troc (ACCEPT -> ACCEPTED)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'oiseau-1', capabilities: [] },
      } as any);

      const mockResolve = vi.fn().mockResolvedValueOnce({ success: true, status: 'ACCEPTED' });
      vi.mocked(EcommerceOrchestrator).mockImplementationOnce(() => ({
        resolveBarter: mockResolve,
      } as any));

      const req = new Request('http://localhost/api/ecommerce/barter/barter-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ACCEPT' }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ slug: 'barter-123' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockResolve).toHaveBeenCalledWith(
        {
          barterUid: 'barter-123',
          acceptorUid: 'oiseau-1',
          status: 'ACCEPTED',
        },
        { actorUid: 'oiseau-1', capabilities: [] }
      );
    });

    it('devrait réussir (200) et résoudre le troc avec un statut explicite', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'oiseau-1', capabilities: ['*'] },
      } as any);

      const mockResolve = vi.fn().mockResolvedValueOnce({ success: true, status: 'REJECTED' });
      vi.mocked(EcommerceOrchestrator).mockImplementationOnce(() => ({
        resolveBarter: mockResolve,
      } as any));

      const req = new Request('http://localhost/api/ecommerce/barter/barter-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED' }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ slug: 'barter-123' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockResolve).toHaveBeenCalledWith(
        {
          barterUid: 'barter-123',
          acceptorUid: 'oiseau-1',
          status: 'REJECTED',
        },
        { actorUid: 'oiseau-1', capabilities: ['*'] }
      );
    });
  });
});