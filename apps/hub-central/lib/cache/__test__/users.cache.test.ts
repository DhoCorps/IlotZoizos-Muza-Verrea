// Fichier : __test__/cache/users.cache.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  getCachedOiseaux, 
  getCachedOiseau, 
  getCachedObservatoryReport 
} from '@/lib/cache/users.cache';
import { connectToDatabase, OiseauModel } from '@ilot/infrastructure';
import { ObservatoryEngine } from '@ilot/shared-core';
import { unstable_cache } from 'next/cache';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  OiseauModel: {
    find: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock('@ilot/shared-core', () => ({
  ObservatoryEngine: {
    generateReport: vi.fn((data) => ({ globalScore: 88, metrics: data })),
  },
}));

describe('Cache : Users Cache Helpers (Volière & Observatoire)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe('getCachedOiseaux', () => {
    it('doit récupérer la liste des oiseaux filtrée par phrase de recherche', async () => {
      const mockOiseaux = [{ uid: 'bird_1', slug: 'architecte', pseudo: 'Architecte' }];
      
      const mockExecChain = {
        select: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue(mockOiseaux),
            }),
          }),
        }),
      };

      vi.mocked(OiseauModel.find).mockReturnValue(mockExecChain as any);

      const result = await getCachedOiseaux('architecte');

      expect(result).toEqual(mockOiseaux);
      expect(connectToDatabase).toHaveBeenCalled();
      expect(OiseauModel.find).toHaveBeenCalledWith({
        $or: [
          { slug: { $regex: 'architecte', $options: 'i' } },
          { pseudo: { $regex: 'architecte', $options: 'i' } },
          { capabilities: { $regex: 'architecte', $options: 'i' } },
        ],
      });
    });

    it('doit récupérer la liste complète sans filtre si searchPhrase est null', async () => {
      const mockOiseaux = [{ uid: 'bird_2', slug: 'libre' }];
      
      const mockExecChain = {
        select: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue(mockOiseaux),
            }),
          }),
        }),
      };

      vi.mocked(OiseauModel.find).mockReturnValue(mockExecChain as any);

      const result = await getCachedOiseaux(null);

      expect(result).toEqual(mockOiseaux);
      expect(OiseauModel.find).toHaveBeenCalledWith({});
    });
  });

  describe('getCachedOiseau', () => {
    it('doit récupérer un profil spécifique par son slug ou son uid', async () => {
      const mockUser = { uid: 'bird_1', slug: 'architecte', pseudo: 'Architecte' };
      
      vi.mocked(OiseauModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce(mockUser),
      } as any);

      const result = await getCachedOiseau('architecte');

      expect(result).toEqual(mockUser);
      expect(connectToDatabase).toHaveBeenCalled();
      expect(OiseauModel.findOne).toHaveBeenCalledWith({
        $or: [{ slug: 'architecte' }, { uid: 'architecte' }],
      });
    });
  });

  describe('getCachedObservatoryReport', () => {
    it('doit générer le rapport de l\'Observatoire pour un oiseau existant', async () => {
      const mockUser = { 
        uid: 'bird_1', 
        slug: 'architecte', 
        pseudo: 'Architecte',
        emotionalIntensity: 50,
        currentAcceptance: 4 
      };

      vi.mocked(OiseauModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce(mockUser),
      } as any);

      const result = await getCachedObservatoryReport('architecte');

      expect(result).toEqual({
        birdName: 'Architecte',
        report: {
          globalScore: 88,
          metrics: {
            dependencies: [{ id: 'dep-1', status: 1 }, { id: 'dep-2', status: 1 }],
            tasks: [
              { estimatedTime: 30, realTime: 25, weight: 3 },
              { estimatedTime: 60, realTime: 60, weight: 5 },
            ],
            exchanges: [
              { type: 'GIFT', value: 40 },
              { type: 'TAKE', value: 15 },
            ],
            emotionalIntensity: 50,
            currentAcceptance: 4,
          },
        },
      });
      expect(ObservatoryEngine.generateReport).toHaveBeenCalled();
    });

    it('doit retourner null si l\'oiseau n\'est pas trouvé dans la base', async () => {
      vi.mocked(OiseauModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce(null),
      } as any);

      const result = await getCachedObservatoryReport('oiseau-fantome');

      expect(result).toBeNull();
      expect(ObservatoryEngine.generateReport).not.toHaveBeenCalled();
    });
  });
});