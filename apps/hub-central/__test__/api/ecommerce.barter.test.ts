import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, PATCH } from '@/app/api/ecommerce/barter/route';
import { BarterOfferModel } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', () => ({
  withSilice: (handler: any) => handler,
  withAura: (handler: any) => async (req: any, ctx: any) => {
    const mockUser = global.__mockUser;
    if (!mockUser || !mockUser.uid) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }
    return await handler(req, ctx, mockUser);
  },
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((cb) => cb),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  BarterOfferModel: {
    find: vi.fn(() => ({
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([{ uid: 'barter_1', status: 'PENDING' }]),
    })),
    // Correction : On fait en sorte que create renvoie les données passées avec un uid
    create: vi.fn().mockImplementation((data) => Promise.resolve(data)),
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock('@ilot/shared-core', () => ({
  EcommerceOrchestrator: vi.fn().mockImplementation(() => ({
    proposeBarter: vi.fn().mockResolvedValue(true),
    resolveBarter: vi.fn().mockResolvedValue(true),
  })),
}));

declare global {
  var __mockUser: any;
}

describe('API Barter Offers (Troc)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;
  });

  describe('GET /api/ecommerce/barter', () => {
    it('🟢 doit récupérer la liste des offres de troc en attente avec succès (200)', async () => {
      const req = new Request('http://localhost/api/ecommerce/barter');
      const res = await GET(req as any, {});
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toHaveLength(1);
      expect(json[0].uid).toBe('barter_1');
    });
  });

  describe('POST /api/ecommerce/barter', () => {
    it('🔴 doit refuser l\'accès (401) si l\'oiseau n\'est pas authentifié', async () => {
      global.__mockUser = undefined;

      const req = new Request('http://localhost/api/ecommerce/barter', {
        method: 'POST',
        body: JSON.stringify({ receiverUid: 'bird_2' })
      });

      const res = await POST(req as any, {});
      expect(res.status).toBe(401);
    });

    it('🟢 doit proposer un troc avec succès (201) et invalider le cache', async () => {
      global.__mockUser = { uid: 'bird_1', capabilities: [] };

      const req = new Request('http://localhost/api/ecommerce/barter', {
        method: 'POST',
        body: JSON.stringify({ receiverUid: 'bird_2', offeredProductUids: ['prod_1'], requestedProductUids: ['prod_2'] })
      });

      const res = await POST(req as any, {});
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.uid).toBeDefined();
      expect(json.data.initiatorUid).toBe('bird_1');
      expect(revalidateTag).toHaveBeenCalledWith('barter-offers');
      expect(revalidateTag).toHaveBeenCalledWith('pending-barters');
    });
  });

  describe('PATCH /api/ecommerce/barter', () => {
    it('🟢 doit mettre à jour le statut du troc (200) et invalider le cache', async () => {
      global.__mockUser = { uid: 'bird_2', capabilities: [] };

      vi.mocked(BarterOfferModel.findOneAndUpdate).mockResolvedValueOnce({
        uid: 'barter_1',
        status: 'ACCEPTED'
      } as any);

      const req = new Request('http://localhost/api/ecommerce/barter', {
        method: 'PATCH',
        body: JSON.stringify({ barterUid: 'barter_1', status: 'ACCEPTED' })
      });

      const res = await PATCH(req as any, {});
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.status).toBe('ACCEPTED');
      expect(revalidateTag).toHaveBeenCalledWith('barter-offers');
      expect(revalidateTag).toHaveBeenCalledWith('barter-barter_1');
    });
  });
});