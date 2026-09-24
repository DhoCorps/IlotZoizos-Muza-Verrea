// Fichier : __test__/cache/showcase.cache.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCachedStream } from '@/lib/cache/showcase.cache';
import { ShowcaseOrchestrator } from '@ilot/shared-core';
import { unstable_cache } from 'next/cache';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
}));

vi.mock('@ilot/shared-core', () => ({
  ShowcaseOrchestrator: {
    getPersonalizedShowcase: vi.fn(),
  },
}));

describe('Cache : getCachedStream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs(); // Nettoie les variables stubbées après chaque test
  });

  it('doit exécuter directement le fetcher en environnement de test (bypass du cache)', async () => {
    const mockData = [{ mediaId: 'media_1' }];
    vi.mocked(ShowcaseOrchestrator.getPersonalizedShowcase).mockResolvedValue(mockData as any);

    const filters = {
      selectedApps: ['BIBLIOTEK', 'DHO'] as Array<"SPRITE" | "BIBLIOTEK" | "DHO" | "PARTITA" | "LETRIN" | "ABYSS" | "GALLERY" | "UNKNOWN">,
      onlyTradable: true,
    };

const result = await getCachedStream('bird_123', filters);

    expect(result).toEqual(mockData);
    expect(ShowcaseOrchestrator.getPersonalizedShowcase).toHaveBeenCalledWith('bird_123', filters);
  });

  it('doit encapsuler la récupération dans unstable_cache en dehors de l\'environnement de test', async () => {
    // 🛡️ Modification propre de NODE_ENV via Vitest
    vi.stubEnv('NODE_ENV', 'production');

    const mockData = [{ mediaId: 'media_2' }];
    vi.mocked(ShowcaseOrchestrator.getPersonalizedShowcase).mockResolvedValue(mockData as any);

    const filters = {
      selectedApps: ['BIBLIOTEK', 'DHO'] as Array<"SPRITE" | "BIBLIOTEK" | "DHO" | "PARTITA" | "LETRIN" | "ABYSS" | "GALLERY" | "UNKNOWN">,
      onlyTradable: true,
    };

const result = await getCachedStream('bird_123', filters);

    expect(result).toEqual(mockData);
    expect(unstable_cache).toHaveBeenCalled();
  });
});