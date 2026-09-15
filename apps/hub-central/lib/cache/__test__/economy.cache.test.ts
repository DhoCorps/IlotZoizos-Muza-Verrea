// Fichier : __test__/cache/economy.cache.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCachedInventory } from '@/lib/cache/economy.cache';
import { EconomyService } from '@ilot/infrastructure';
import { unstable_cache } from 'next/cache';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
}));

vi.mock('@ilot/infrastructure', () => ({
  EconomyService: {
    getInventory: vi.fn(),
  },
}));

describe('Cache : getCachedInventory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('doit exécuter directement le fetcher en environnement de test (bypass du cache)', async () => {
    const mockInventory = { parchemins: 10, plumes: 3 };
    vi.mocked(EconomyService.getInventory).mockResolvedValueOnce(mockInventory as any);

    const result = await getCachedInventory('bird_eco_123');

    expect(result).toEqual(mockInventory);
    expect(EconomyService.getInventory).toHaveBeenCalledWith('bird_eco_123');
  });

  it('doit encapsuler la récupération dans unstable_cache en dehors de l\'environnement de test', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    const mockInventory = { parchemins: 5, plumes: 1 };
    vi.mocked(EconomyService.getInventory).mockResolvedValueOnce(mockInventory as any);

    const result = await getCachedInventory('bird_eco_456');

    expect(result).toEqual(mockInventory);
    expect(unstable_cache).toHaveBeenCalled();
  });
});