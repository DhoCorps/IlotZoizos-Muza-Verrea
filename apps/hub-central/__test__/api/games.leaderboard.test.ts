import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/games/leaderboard/route';
import { GameResultModel } from '@ilot/infrastructure';
import { NextRequest, NextResponse } from 'next/server';
import type { ApiContext } from '@/lib/api-guards';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-guards')>();
  return {
    ...actual,
    withSilice: (handler: unknown) => async (req: NextRequest, context: ApiContext) => {
      // @ts-ignore
      return await handler(req, context);
    },
    handleRouteError: (error: unknown, defaultMessage: string) => {
      const status = (error as { status?: number; statusCode?: number }).status || (error as { statusCode?: number }).statusCode || 500;
      const message = (error as { message?: string }).message || defaultMessage;
      return NextResponse.json({ success: false, error: message }, { status });
    }
  };
});

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb: Function) => cb),
  revalidateTag: vi.fn(),
}));

// 🛡️ MOCK MONGOOSE PLEINEMENT CHAÎNABLE
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    connectToDatabase: vi.fn().mockResolvedValue(true),
    GameResultModel: {
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([{ username: 'Oiseau', score: 10 }]),
          }),
        }),
      }),
    },
  };
});

type RouteHandler = (req: NextRequest, ctx: ApiContext) => Promise<Response>;

describe('GET /api/games/leaderboard', () => {
  const getHandler = GET as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 devrait retourner les scores avec succès (200)', async () => {
    vi.mocked(GameResultModel.find).mockReturnValueOnce({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([{ username: 'Oiseau', score: 10 }]),
        }),
      }),
    } as unknown as ReturnType<typeof GameResultModel.find>);

    const req = new NextRequest('http://localhost/api/games/leaderboard?gameType=KoOonTreez&limit=5');
    const res = await getHandler(req, {} as ApiContext);
    const data = await res.json() as { success: boolean; scores: Array<{ username: string; score: number }> };

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.scores).toHaveLength(1);
    expect(data.scores[0].username).toBe('Oiseau');
    // Alignement sur la casse convertie par le cache/route
    expect(GameResultModel.find).toHaveBeenCalledWith({ gameType: 'kooontreez' });
  });

  it('🔴 doit capturer les erreurs de la matrice et retourner une erreur 500', async () => {
    vi.mocked(GameResultModel.find).mockImplementation(() => {
      throw new Error('Matrice corrompue');
    });

    const req = new NextRequest('http://localhost/api/games/leaderboard');
    const res = await getHandler(req, {} as ApiContext);
    const data = await res.json() as { success: boolean; error: string };

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
  });
});