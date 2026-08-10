import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/games/leaderboard/route';
import { GameResultModel } from '@ilot/infrastructure';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', () => ({
  withSilice: (handler: any) => handler,
}));

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
}));

// 🛡️ MOCK MONGOOSE PLEINEMENT CHAÎNABLE
vi.mock('@ilot/infrastructure', () => ({
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
}));

describe('GET /api/games/leaderboard', () => {
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
    } as any);

    const req = new Request('http://localhost/api/games/leaderboard?gameType=KoOonTreez&limit=5');
    const res = await GET(req as any, {});
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.scores).toHaveLength(1);
    expect(data.scores[0].username).toBe('Oiseau');
    expect(GameResultModel.find).toHaveBeenCalledWith({ gameType: 'KoOonTreez' });
  });
});