import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, DELETE } from '@/app/api/ecommerce/stores/[slug]/route';
import { StoreModel } from '@ilot/infrastructure';
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

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val) => val),
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((cb) => cb),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  StoreModel: {
    findOne: vi.fn(),
    deleteOne: vi.fn(),
  },
}));

vi.mock('@ilot/shared-core', () => ({
  EcommerceOrchestrator: vi.fn().mockImplementation(() => ({
    dissolveStore: vi.fn().mockResolvedValue(true),
  })),
}));

declare global {
  var __mockUser: any;
}

describe('API Store [slug] (GET & DELETE)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;
  });

  describe('GET /api/stores/[slug]', () => {
    it('🟢 doit récupérer la boutique avec succès (200)', async () => {
      vi.mocked(StoreModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 'store_1', storeName: 'Ma Boutique' })
      } as any);

      const req = new Request('http://localhost/api/stores/ma-boutique');
      const res = await GET(req as any, { params: Promise.resolve({ slug: 'ma-boutique' }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.uid).toBe('store_1');
    });

    it('🔴 doit renvoyer 404 si la boutique est introuvable', async () => {
      vi.mocked(StoreModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null)
      } as any);

      const req = new Request('http://localhost/api/stores/inconnue');
      const res = await GET(req as any, { params: Promise.resolve({ slug: 'inconnue' }) });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/stores/[slug]', () => {
    it('🔴 doit refuser l\'accès (401) si l\'oiseau n\'est pas authentifié', async () => {
      global.__mockUser = undefined;

      const req = new Request('http://localhost/api/stores/ma-boutique', { method: 'DELETE' });
      const res = await DELETE(req as any, { params: Promise.resolve({ slug: 'ma-boutique' }) });

      expect(res.status).toBe(401);
    });

    it('🟢 doit dissoudre la boutique avec succès (200) et invalider le cache', async () => {
      global.__mockUser = { uid: 'bird_1', capabilities: [] };

      vi.mocked(StoreModel.findOne).mockResolvedValueOnce({
        uid: 'store_1',
        slug: 'ma-boutique'
      } as any);

      const req = new Request('http://localhost/api/stores/ma-boutique', { method: 'DELETE' });
      const res = await DELETE(req as any, { params: Promise.resolve({ slug: 'ma-boutique' }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(revalidateTag).toHaveBeenCalledWith('stores');
      expect(revalidateTag).toHaveBeenCalledWith('store-ma-boutique');
    });
  });
});