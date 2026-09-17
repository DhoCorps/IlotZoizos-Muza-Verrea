import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/canopy/awards/route';
import { CanopyAwardModel } from '@ilot/infrastructure';
import type { ApiContext } from '@/lib/api-guards';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb: Function) => cb),
}));

vi.mock('@ilot/infrastructure', () => ({
  CanopyAwardModel: {
    find: vi.fn()
  }
}));

vi.mock('@/lib/api-guards', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-guards')>();
  return {
    ...actual,
    withSilice: (handler: unknown) => handler,
  };
});

declare global {
  // 🛡️ Harmonisation stricte de la signature globale pour __mockUser
  var __mockUser: { [key: string]: unknown; uid: string; capabilities: string[] } | undefined;
}

type RouteHandler = (req: Request, ctx: ApiContext) => Promise<Response>;

describe('GET /api/canopy/awards', () => {
  const getHandler = GET as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  it('🟢 doit retourner la liste des trophées de la canopée avec succès (200)', async () => {
    const mockQuery = {
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([
        { awardKey: 'MOST_ACTIVE_BIRD', title: "La Plume d'Or", yearMonth: '2026-08' }
      ])
    };

    vi.mocked(CanopyAwardModel.find).mockReturnValue(mockQuery as unknown as ReturnType<typeof CanopyAwardModel.find>);

    const req = new Request('http://localhost/api/canopy/awards?yearMonth=2026-08');
    const res = await getHandler(req, {} as ApiContext);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.awards).toHaveLength(1);
    expect(json.awards[0].awardKey).toBe('MOST_ACTIVE_BIRD');
  });
});