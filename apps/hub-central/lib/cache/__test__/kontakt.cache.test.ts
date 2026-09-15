// Fichier : __test__/cache/kontakt.cache.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  getCachedTemplates, 
  getCachedTemplateDetail, 
  getCachedActiveQuests, 
  getCachedKontaktProfiles 
} from '@/lib/cache/kontakt.cache';
import { CVTemplateModel, JobQuestModel, KontaktProfileModel } from '@ilot/infrastructure';
import { unstable_cache } from 'next/cache';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
}));

vi.mock('@ilot/infrastructure', () => ({
  CVTemplateModel: {
    find: vi.fn(),
    findOne: vi.fn(),
  },
  JobQuestModel: {
    find: vi.fn(),
  },
  KontaktProfileModel: {
    find: vi.fn(),
  },
}));

describe('Cache : Kontakt Cache Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe('getCachedTemplates', () => {
    it('doit récupérer les templates de CV en mode test (bypass cache)', async () => {
      const mockTemplates = [{ uid: 'tpl_1', title: 'CV Développeur' }];
      vi.mocked(CVTemplateModel.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockTemplates),
        }),
      } as any);

      const result = await getCachedTemplates('bird_1');

      expect(result).toEqual(mockTemplates);
      expect(CVTemplateModel.find).toHaveBeenCalledWith({ authorUid: 'bird_1' });
    });

    it('doit utiliser unstable_cache en dehors du mode test', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      const mockTemplates = [{ uid: 'tpl_2', title: 'CV Designer' }];
      vi.mocked(CVTemplateModel.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockTemplates),
        }),
      } as any);

      const result = await getCachedTemplates();

      expect(result).toEqual(mockTemplates);
      expect(unstable_cache).toHaveBeenCalled();
    });
  });

  describe('getCachedTemplateDetail', () => {
    it('doit récupérer le détail d\'un template par son slug', async () => {
      const mockTemplate = { uid: 'tpl_1', slug: 'cv-tech' };
      vi.mocked(CVTemplateModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockTemplate),
      } as any);

      const result = await getCachedTemplateDetail('cv-tech');

      expect(result).toEqual(mockTemplate);
      expect(CVTemplateModel.findOne).toHaveBeenCalledWith({ slug: 'cv-tech' });
    });
  });

  describe('getCachedActiveQuests', () => {
    it('doit récupérer les quêtes de type ACTIVE', async () => {
      const mockQuests = [{ uid: 'quest_1', status: 'ACTIVE' }];
      vi.mocked(JobQuestModel.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockQuests),
        }),
      } as any);

      const result = await getCachedActiveQuests();

      expect(result).toEqual(mockQuests);
      expect(JobQuestModel.find).toHaveBeenCalledWith({ status: 'ACTIVE' });
    });
  });

  describe('getCachedKontaktProfiles', () => {
    it('doit filtrer les profils Kontakt par alignement et statut', async () => {
      const mockProfiles = [{ uid: 'prof_1', alignment: 'NEUTRAL', availabilityStatus: 'AVAILABLE' }];
      vi.mocked(KontaktProfileModel.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockProfiles),
        }),
      } as any);

      const result = await getCachedKontaktProfiles('NEUTRAL', 'AVAILABLE');

      expect(result).toEqual(mockProfiles);
      expect(KontaktProfileModel.find).toHaveBeenCalledWith({
        alignment: 'NEUTRAL',
        availabilityStatus: 'AVAILABLE',
      });
    });
  });
});