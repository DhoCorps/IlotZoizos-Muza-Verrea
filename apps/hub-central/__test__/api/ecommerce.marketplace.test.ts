import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/ecommerce/marketPlace/route';
import { ProductModel } from '@ilot/infrastructure';
import { NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', () => ({
  withSilice: (handler: any) => handler,
}));

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  ProductModel: {
    find: vi.fn(() => ({
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    })),
  },
}));

describe('API Marketplace (GET)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;
  });

  it('🟢 doit récupérer la liste des produits enrichis avec succès (200)', async () => {
    vi.mocked(ProductModel.find).mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        { uid: 'prod_1', title: 'Synthétiseur Ancien', ownerUid: 'bird_1' }
      ]),
    } as any);

    const req = new Request('http://localhost/api/marketplace?category=SYNTH');
    const res = await GET(req as any, {});
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].authorSlug).toBe('bird_1');
  });
});