// Fichier : __test__/cache/sujets.cache.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCachedSujets, getCachedSujetDetails } from '@/lib/cache/sujets.cache';
import { SujetModel } from '@ilot/infrastructure';
import { unstable_cache } from 'next/cache';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
}));

vi.mock('@ilot/infrastructure', () => ({
  SujetModel: {
    find: vi.fn(),
    findOne: vi.fn(),
  },
}));

describe('Cache : Sujets Cache Helpers (Bibliothèque)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe('getCachedSujets', () => {
    it('doit récupérer les sujets publiés et ceux de l\'utilisateur avec filtre de catégorie optionnel', async () => {
      const mockSujets = [{ uid: 'suj_1', title: 'Philosophie de la Silice', status: 'PUBLISHED' }];
      
      const mockExecChain = {
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(mockSujets),
          }),
        }),
      };

      vi.mocked(SujetModel.find).mockReturnValue(mockExecChain as any);

      const result = await getCachedSujets('bird_1', 'PHILOSOPHY');

      expect(result).toEqual(mockSujets);
      expect(SujetModel.find).toHaveBeenCalledWith({
        $or: [
          { status: 'PUBLISHED' },
          { authorUid: 'bird_1' },
        ],
        category: 'PHILOSOPHY',
      });
    });

    it('doit récupérer uniquement les sujets publiés en mode public sans userUid ni catégorie', async () => {
      const mockSujets = [{ uid: 'suj_2', status: 'PUBLISHED' }];
      
      const mockExecChain = {
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(mockSujets),
          }),
        }),
      };

      vi.mocked(SujetModel.find).mockReturnValue(mockExecChain as any);

      const result = await getCachedSujets();

      expect(result).toEqual(mockSujets);
      expect(SujetModel.find).toHaveBeenCalledWith({
        $or: [{ status: 'PUBLISHED' }],
      });
    });
  });

  describe('getCachedSujetDetails', () => {
    it('doit récupérer un sujet spécifique par son slug ou son uid', async () => {
      const mockSujet = { uid: 'suj_1', slug: 'sujet-transcendantal' };
      
      const mockExecChain = {
        lean: vi.fn().mockResolvedValueOnce(mockSujet),
      };

      vi.mocked(SujetModel.findOne).mockReturnValue(mockExecChain as any);

      const result = await getCachedSujetDetails('sujet-transcendantal');

      expect(result).toEqual(mockSujet);
      expect(SujetModel.findOne).toHaveBeenCalledWith({
        $or: [{ slug: 'sujet-transcendantal' }, { uid: 'sujet-transcendantal' }],
      });
    });
  });
});