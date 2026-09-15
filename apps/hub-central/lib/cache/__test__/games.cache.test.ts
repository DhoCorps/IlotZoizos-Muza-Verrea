// Fichier : __test__/cache/games.cache.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCachedLeaderboard } from '@/lib/cache/games.cache';
import { GameResultModel } from '@ilot/infrastructure';
import { unstable_cache } from 'next/cache';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
}));

vi.mock('@ilot/infrastructure', () => ({
  GameResultModel: {
    find: vi.fn(),
  },
}));

describe('Cache : getCachedLeaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('doit exécuter directement le fetcher en environnement de test (bypass du cache)', async () => {
    const mockScores = [{ gameType: 'quiz', finalScore: 100, createdAt: new Date() }];
    
    vi.mocked(GameResultModel.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockScores),
        }),
      }),
    } as any);

    const result = await getCachedLeaderboard('quiz', 10);

    expect(result).toEqual(mockScores);
    expect(GameResultModel.find).toHaveBeenCalledWith({ gameType: 'quiz' });
  });

  it('doit encapsuler la récupération dans unstable_cache en dehors de l\'environnement de test', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    const mockScores = [{ gameType: 'memory', finalScore: 500, createdAt: new Date() }];
    
    vi.mocked(GameResultModel.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockScores),
        }),
      }),
    } as any);

    const result = await getCachedLeaderboard('memory', 5);

    expect(result).toEqual(mockScores);
    expect(unstable_cache).toHaveBeenCalled();
  });
});