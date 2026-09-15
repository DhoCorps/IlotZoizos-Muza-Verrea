// Fichier : __test__/cache/partita.cache.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCachedPartitas, getCachedPartitaDetails } from '@/lib/cache/partita.cache';
import { PartitaModel } from '@ilot/infrastructure';
import { unstable_cache } from 'next/cache';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
}));

vi.mock('@ilot/infrastructure', () => ({
  PartitaModel: {
    find: vi.fn(),
    findOne: vi.fn(),
  },
}));

describe('Cache : Partita Cache Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe('getCachedPartitas', () => {
    it('doit récupérer le catalogue des partitas avec filtres optionnels et userUid', async () => {
      const mockPartitas = [{ uid: 'part_1', title: 'Partita No. 1', status: 'PUBLISHED' }];
      vi.mocked(PartitaModel.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(mockPartitas),
          }),
        }),
      } as any);

      const result = await getCachedPartitas('bird_1', 'piano', 'PUBLISHED');

      expect(result).toEqual(mockPartitas);
      expect(PartitaModel.find).toHaveBeenCalledWith({
        $or: [
          { status: 'PUBLISHED' },
          { authorUid: 'bird_1' }
        ],
        instrument: 'piano',
        status: 'PUBLISHED',
      });
    });

    it('doit récupérer les partitas publiques sans userUid ni filtres', async () => {
      const mockPartitas = [{ uid: 'part_2', status: 'PUBLISHED' }];
      vi.mocked(PartitaModel.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(mockPartitas),
          }),
        }),
      } as any);

      const result = await getCachedPartitas();

      expect(result).toEqual(mockPartitas);
      expect(PartitaModel.find).toHaveBeenCalledWith({
        $or: [{ status: 'PUBLISHED' }],
      });
    });
  });

  describe('getCachedPartitaDetails', () => {
    it('doit récupérer les détails d\'une partita par son slug ou uid en mode test (bypass)', async () => {
      const mockPartita = { uid: 'part_1', slug: 'partita-bach' };
      vi.mocked(PartitaModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce(mockPartita),
      } as any);

      const result = await getCachedPartitaDetails('partita-bach');

      expect(result).toEqual(mockPartita);
      expect(PartitaModel.findOne).toHaveBeenCalledWith({
        $or: [{ slug: 'partita-bach' }, { uid: 'partita-bach' }],
      });
    });

    it('doit utiliser unstable_cache en dehors du mode test', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      const mockPartita = { uid: 'part_2', slug: 'partita-mozart' };
      vi.mocked(PartitaModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce(mockPartita),
      } as any);

      const result = await getCachedPartitaDetails('partita-mozart');

      expect(result).toEqual(mockPartita);
      expect(unstable_cache).toHaveBeenCalled();
    });
  });
});