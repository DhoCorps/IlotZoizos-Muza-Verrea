// Fichier : __test__/cache/letrin.cache.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  getCachedFonts, 
  getCachedFontDetail, 
  getCachedFontProjects 
} from '@/lib/cache/letrin.cache';
import { LetterSpriteModel, FontProject } from '@ilot/infrastructure';
import { unstable_cache } from 'next/cache';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
}));

vi.mock('@ilot/infrastructure', () => ({
  LetterSpriteModel: {
    find: vi.fn(),
    findOne: vi.fn(),
  },
  FontProject: {
    find: vi.fn(),
  },
}));

describe('Cache : Letr\'In Cache Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe('getCachedFonts', () => {
    it('doit récupérer la liste des polices/sprites en mode test (bypass cache)', async () => {
      const mockFonts = [{ uid: 'font_1', name: 'Pixel Font' }];
      vi.mocked(LetterSpriteModel.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockFonts),
        }),
      } as any);

      const result = await getCachedFonts();

      expect(result).toEqual(mockFonts);
      expect(LetterSpriteModel.find).toHaveBeenCalledWith({});
    });

    it('doit utiliser unstable_cache en dehors du mode test', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      const mockFonts = [{ uid: 'font_2', name: 'Vector Font' }];
      vi.mocked(LetterSpriteModel.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockFonts),
        }),
      } as any);

      const result = await getCachedFonts();

      expect(result).toEqual(mockFonts);
      expect(unstable_cache).toHaveBeenCalled();
    });
  });

  describe('getCachedFontDetail', () => {
    it('doit récupérer le détail d\'une police par son slug', async () => {
      const mockFont = { uid: 'font_1', slug: 'pixel-font' };
      vi.mocked(LetterSpriteModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockFont),
      } as any);

      const result = await getCachedFontDetail('pixel-font');

      expect(result).toEqual(mockFont);
      expect(LetterSpriteModel.findOne).toHaveBeenCalledWith({ slug: 'pixel-font' });
    });
  });

  describe('getCachedFontProjects', () => {
    it('doit récupérer la liste des projets de police triés par date de mise à jour', async () => {
      const mockProjects = [{ uid: 'proj_1', title: 'Mon Projet LetrIn' }];
      vi.mocked(FontProject.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockProjects),
        }),
      } as any);

      const result = await getCachedFontProjects();

      expect(result).toEqual(mockProjects);
      expect(FontProject.find).toHaveBeenCalledWith({});
    });
  });
});