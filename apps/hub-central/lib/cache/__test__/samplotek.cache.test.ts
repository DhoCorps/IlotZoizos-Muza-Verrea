// Fichier : __test__/cache/samplotek.cache.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCachedSamples } from '@/lib/cache/samplotek.cache';
import { SampleModel } from '@ilot/infrastructure';
import { unstable_cache } from 'next/cache';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
}));

vi.mock('@ilot/infrastructure', () => ({
  SampleModel: {
    find: vi.fn(),
  },
}));

describe('Cache : Samplotek Cache Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe('getCachedSamples', () => {
    it('doit récupérer la banque de sons triée par date en mode test (bypass cache)', async () => {
      const mockSamples = [
        { uid: 'sample_1', title: 'Kick 808', category: 'PERC' },
        { uid: 'sample_2', title: 'Snare LoFi', category: 'PERC' },
      ];

      vi.mocked(SampleModel.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockSamples),
        }),
      } as any);

      const result = await getCachedSamples();

      expect(result).toEqual(mockSamples);
      expect(SampleModel.find).toHaveBeenCalledWith({});
    });

    it('doit utiliser unstable_cache en dehors du mode test', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      const mockSamples = [{ uid: 'sample_3', title: 'Pad Ambient' }];
      vi.mocked(SampleModel.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockSamples),
        }),
      } as any);

      const result = await getCachedSamples();

      expect(result).toEqual(mockSamples);
      expect(unstable_cache).toHaveBeenCalled();
    });
  });
});