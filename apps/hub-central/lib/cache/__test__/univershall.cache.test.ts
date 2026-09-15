// Fichier : __test__/cache/univershall.cache.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCachedUniversHallStream } from '@/lib/cache/univershall.cache';
import { UniversalMediaModel } from '@ilot/infrastructure';
import { unstable_cache } from 'next/cache';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
}));

vi.mock('@ilot/infrastructure', () => ({
  UniversalMediaModel: {
    find: vi.fn(),
  },
}));

describe('Cache : UniversHall Cache Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe('getCachedUniversHallStream', () => {
    it('doit récupérer, filtrer par consentement et sérialiser les flux UniversHall en mode test (bypass cache)', async () => {
      const mockRawItems = [
        {
          mediaId: 'media_1',
          sourceApp: 'letrin',
          ownerUid: 'bird_1',
          ownerSlug: 'architecte',
          title: 'Art de la Silice',
          mediaUrl: 'https://cdn.ilot/art.png',
          thumbnailUrl: 'https://cdn.ilot/thumb.png',
          priceCents: 1500,
          metadata: { fontType: 'pixel' },
          createdAt: new Date('2026-03-01T12:00:00Z'),
          consentForShowcase: true,
          internalNotes: 'confidentiel', // Doit être ignoré par le mapping
        },
      ];

      const mockExecChain = {
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(mockRawItems),
          }),
        }),
      };

      vi.mocked(UniversalMediaModel.find).mockReturnValue(mockExecChain as any);

      const result = await getCachedUniversHallStream();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        mediaId: 'media_1',
        sourceApp: 'letrin',
        ownerUid: 'bird_1',
        ownerSlug: 'architecte',
        title: 'Art de la Silice',
        mediaUrl: 'https://cdn.ilot/art.png',
        thumbnailUrl: 'https://cdn.ilot/thumb.png',
        priceCents: 1500,
        metadata: { fontType: 'pixel' },
        createdAt: new Date('2026-03-01T12:00:00Z'),
      });
      // Vérifie que l'on ne récupère que les éléments consentants
      expect(UniversalMediaModel.find).toHaveBeenCalledWith({ consentForShowcase: true });
    });

    it('doit retourner un tableau vide si aucun artefact consentant n\'est trouvé', async () => {
      const mockExecChain = {
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
          }),
        }),
      };

      vi.mocked(UniversalMediaModel.find).mockReturnValue(mockExecChain as any);

      const result = await getCachedUniversHallStream();

      expect(result).toEqual([]);
    });

    it('doit utiliser unstable_cache en dehors du mode test', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      const mockExecChain = {
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
          }),
        }),
      };

      vi.mocked(UniversalMediaModel.find).mockReturnValue(mockExecChain as any);

      const result = await getCachedUniversHallStream();

      expect(result).toEqual([]);
      expect(unstable_cache).toHaveBeenCalled();
    });
  });
});