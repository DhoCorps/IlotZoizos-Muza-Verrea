// Fichier : __test__/cache/demopraxy.cache.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCachedDemopraxicMetrics } from '@/lib/cache/demopraxy.cache';
import { OiseauModel } from '@ilot/infrastructure';
import { unstable_cache } from 'next/cache';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
}));

vi.mock('@ilot/infrastructure', () => ({
  OiseauModel: {
    findOne: vi.fn(),
  },
}));

describe('Cache : getCachedDemopraxicMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('doit exécuter directement le fetcher en environnement de test (bypass du cache)', async () => {
    const mockUser = { uid: 'bird_1', slug: 'oiseau-libre', sanctuaryVerrouille: false };
    vi.mocked(OiseauModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValueOnce(mockUser),
    } as any);

    const result = await getCachedDemopraxicMetrics('bird_target_1');

    expect(result).toEqual({
      uid: 'bird_1',
      slug: 'oiseau-libre',
      sanctuaryVerrouille: false,
      demopraxyState: null,
    });
    expect(OiseauModel.findOne).toHaveBeenCalled();
  });

  it('doit encapsuler la récupération dans unstable_cache en dehors de l\'environnement de test', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    const mockUser = { uid: 'bird_2', slug: 'oiseau-sage', sanctuaryVerrouille: false };
    vi.mocked(OiseauModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValueOnce(mockUser),
    } as any);

    const result = await getCachedDemopraxicMetrics('bird_target_2');

    expect(result.uid).toBe('bird_2');
    expect(unstable_cache).toHaveBeenCalled();
  });
});