import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/ecommerce/marketPlace/route';
import { ProductModel } from '@ilot/infrastructure';
import { NextResponse, NextRequest } from 'next/server';
import type { ApiContext } from '@/lib/api-guards';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-guards')>();
  return {
    ...actual,
    withSilice: (handler: unknown) => handler,
  };
});

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb: Function) => cb),
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

declare global {
  // 🛡️ Harmonisation de la signature globale de __mockUser
  var __mockUser: { [key: string]: unknown; uid: string; capabilities: string[] } | undefined;
}

type RouteHandler = (req: NextRequest, ctx: ApiContext) => Promise<Response>;

describe('API Marketplace (GET)', () => {
  const getHandler = GET as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  it('🟢 doit récupérer la liste des produits enrichis avec succès (200)', async () => {
    vi.mocked(ProductModel.find).mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        { uid: 'prod_1', title: 'Synthétiseur Ancien', authorSlug: 'bird_1' }
      ]),
    } as unknown as ReturnType<typeof ProductModel.find>);

    const req = new NextRequest('http://localhost/api/marketplace?category=SYNTH');
    const res = await getHandler(req, {} as ApiContext);
    const json = await res.json() as { success: boolean; data: Array<{ authorSlug: string }> };

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].authorSlug).toBe('bird_1');
  });
});