import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/canopy/stats/route';
import { MessageModel } from '@ilot/infrastructure';
import type { ApiContext } from '@/lib/api-guards';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb: Function) => cb),
}));

vi.mock('@ilot/infrastructure', () => ({
  MessageModel: {
    findOne: vi.fn()
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

describe('GET /api/canopy/stats', () => {
  const getHandler = GET as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  it('🟢 doit retourner les statistiques de la dernière diffusion', async () => {
    const mockQuery = {
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue({
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
        metadata: {
          statsSnapshot: {
            yearMonth: '2026-08',
            macroTotals: { test: 100 },
            topSellers: [],
            topBuyers: [],
            mostCommented: [],
            mostReactive: []
          }
        }
      })
    };

    vi.mocked(MessageModel.findOne).mockReturnValue(mockQuery as unknown as ReturnType<typeof MessageModel.findOne>);

    const req = new Request('http://localhost/api/canopy/stats');
    const res = await getHandler(req, {} as ApiContext);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.yearMonth).toBe('2026-08');
  });
});