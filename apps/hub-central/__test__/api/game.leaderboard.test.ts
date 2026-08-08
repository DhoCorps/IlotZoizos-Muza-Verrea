import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/games/leaderboard/route';
import { GameResultModel } from '@ilot/infrastructure';
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

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  const mockLean = vi.fn().mockResolvedValue([{ username: 'Oiseau', score: 10 }]);
  const mockLimit = vi.fn().mockReturnValue({ lean: mockLean });
  const mockSort = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockFind = vi.fn().mockReturnValue({ sort: mockSort });

  return {
    ...actual,
    connectToDatabase: vi.fn().mockResolvedValue(true),
    GameResultModel: {
      find: mockFind,
    },
  };
});

describe('GET /api/games/leaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 devrait retourner les scores avec succès (200)', async () => {
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