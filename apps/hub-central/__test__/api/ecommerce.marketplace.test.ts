import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/ecommerce/marketPlace/route';
import { NextResponse, NextRequest } from 'next/server';
import type { ApiContext } from '@/lib/api-guards';
import { getCachedMarketplaceProducts } from '@/lib/cache/ecommerce.cache';

// -------------------------------------------------------------------------
// 🎭 MOCKS HOISTÉS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
const { mockGetCachedMarketplaceProducts } = vi.hoisted(() => ({
  mockGetCachedMarketplaceProducts: vi.fn().mockResolvedValue([
    { uid: 'prod_1', title: 'Synthétiseur Ancien', authorSlug: 'bird_1', tags: ['synth'] }
  ])
}));

vi.mock('@/lib/cache/ecommerce.cache', () => ({
  getCachedMarketplaceProducts: mockGetCachedMarketplaceProducts,
}));

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

declare global {
  var __mockUser: { [key: string]: unknown; uid: string; capabilities: string[] } | undefined;
}

type RouteHandler = (req: NextRequest, ctx: ApiContext) => Promise<Response>;

describe('API Marketplace (GET)', () => {
  const getHandler = GET as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCachedMarketplaceProducts.mockResolvedValue([
      { uid: 'prod_1', title: 'Synthétiseur Ancien', authorSlug: 'bird_1', tags: ['synth'] }
    ]);
  });

  it('🟢 doit récupérer la liste des produits enrichis et transmettre les tags extraits de l\'URL (200)', async () => {
    const req = new NextRequest('http://localhost/api/marketplace?category=SYNTH&tag=synth&tag=analog');
    const res = await getHandler(req, {} as ApiContext);
    const json = await res.json() as { success: boolean; data: Array<{ authorSlug: string }> };

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].authorSlug).toBe('bird_1');

    // 🛡️ Vérification que les tags multiples sont bien extraits et transmis au cache
    expect(mockGetCachedMarketplaceProducts).toHaveBeenCalledWith('SYNTH', null, null, ['synth', 'analog']);
  });
});