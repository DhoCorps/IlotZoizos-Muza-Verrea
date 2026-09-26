import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  getCachedFonts, 
  getCachedFontDetail, 
  getCachedFontProjects 
} from '@/lib/cache/letrin.cache';
import { LetrinFontSpriteModel } from '@ilot/infrastructure';
import { unstable_cache } from 'next/cache';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
}));

// 🛡️ MOCK DU MODÈLE MAÎTRE UNIQUE
vi.mock('@ilot/infrastructure', () => ({
  LetrinFontSpriteModel: {
    find: vi.fn(),
    findOne: vi.fn(),
  },
}));

describe('Cache : Letr\'In Cache Helpers (Modèle Unifié)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe('getCachedFonts', () => {
    it('doit récupérer la liste des polices/sprites via LetrinFontSpriteModel en mode test (bypass cache)', async () => {
      const mockFonts = [{ uid: 'font_1', name: 'Pixel Font', category: 'FANTAISIE' }];
      vi.mocked(LetrinFontSpriteModel.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockFonts),
        }),
      } as any);

      const result = await getCachedFonts();

      expect(result).toEqual(mockFonts);
      expect(LetrinFontSpriteModel.find).toHaveBeenCalledWith({});
    });

    it('doit utiliser unstable_cache en dehors du mode test', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      const mockFonts = [{ uid: 'font_2', name: 'Vector Font', category: 'LINEALE' }];
      vi.mocked(LetrinFontSpriteModel.find).mockReturnValue({
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
    it('doit récupérer le détail d\'une police par son slug via LetrinFontSpriteModel', async () => {
      const mockFont = { uid: 'font_1', slug: 'pixel-font', frequencyHz: 432 };
      vi.mocked(LetrinFontSpriteModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockFont),
      } as any);

      const result = await getCachedFontDetail('pixel-font');

      expect(result).toEqual(mockFont);
      expect(LetrinFontSpriteModel.findOne).toHaveBeenCalledWith({ slug: 'pixel-font' });
    });
  });

  describe('getCachedFontProjects', () => {
    it('doit récupérer la liste des projets de police triés par date de mise à jour via LetrinFontSpriteModel', async () => {
      const mockProjects = [{ uid: 'proj_1', name: 'Mon Projet LetrIn', frequencyHz: 528 }];
      vi.mocked(LetrinFontSpriteModel.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockProjects),
        }),
      } as any);

      const result = await getCachedFontProjects();

      expect(result).toEqual(mockProjects);
      expect(LetrinFontSpriteModel.find).toHaveBeenCalledWith({});
    });
  });
});