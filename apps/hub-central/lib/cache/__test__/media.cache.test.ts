// Fichier : __test__/cache/media.cache.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCachedMediaFeed } from '@/lib/cache/media.cache';
import { ProductModel } from '@ilot/infrastructure';
import { unstable_cache } from 'next/cache';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
}));

vi.mock('@ilot/infrastructure', () => ({
  ProductModel: {
    find: vi.fn(),
  },
}));

describe('Cache : getCachedMediaFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('doit récupérer séparément les visuels et les pistes audio en mode test (bypass cache)', async () => {
    const mockVisuals = [{ uid: 'vis_1', category: 'GRAPHIC', name: 'Artwork' }];
    const mockTracks = [{ uid: 'trk_1', category: 'MUSIC', name: 'Partita' }];

    // Simulation des deux appels distincts à ProductModel.find
    vi.mocked(ProductModel.find)
      .mockReturnValueOnce({
        limit: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockVisuals),
        }),
      } as any)
      .mockReturnValueOnce({
        limit: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockTracks),
        }),
      } as any);

    const result = await getCachedMediaFeed();

    expect(result).toEqual({
      visuals: mockVisuals,
      tracks: mockTracks,
    });
    expect(ProductModel.find).toHaveBeenCalledTimes(2);
    expect(ProductModel.find).toHaveBeenCalledWith({
      category: { $in: ['FONT_SPRITE', 'GRAPHIC', 'VIDEO', 'CINEMA'] },
    });
    expect(ProductModel.find).toHaveBeenCalledWith({
      category: { $in: ['MUSIC', 'AUDIO', 'PARTITA'] },
    });
  });

  it('doit encapsuler la récupération dans unstable_cache en dehors de l\'environnement de test', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    vi.mocked(ProductModel.find).mockReturnValue({
      limit: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    } as any);

    const result = await getCachedMediaFeed();

    expect(result).toEqual({ visuals: [], tracks: [] });
    expect(unstable_cache).toHaveBeenCalled();
  });
});