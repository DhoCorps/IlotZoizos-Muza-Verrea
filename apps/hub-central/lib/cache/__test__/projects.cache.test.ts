// Fichier : __test__/cache/projects.cache.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCachedProjects, getCachedProjectDetails } from '@/lib/cache/projects.cache';
import { ProjectModel } from '@ilot/infrastructure';
import { unstable_cache } from 'next/cache';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
}));

vi.mock('@ilot/infrastructure', () => ({
  ProjectModel: {
    find: vi.fn(),
    findOne: vi.fn(),
  },
}));

describe('Cache : Projects Cache Helpers (La Clairière)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe('getCachedProjects', () => {
    it('doit récupérer les projets avec filtres de visibilité publique et de favoris personnels', async () => {
      const mockProjects = [{ uid: 'proj_1', title: 'Îlot Zoizos', visibility: 'PUBLIC' }];
      
      const mockExecChain = {
        select: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue(mockProjects),
            }),
          }),
        }),
      };
      
      vi.mocked(ProjectModel.find).mockReturnValue(mockExecChain as any);

      const result = await getCachedProjects('bird_1', undefined, ['proj_2']);

      expect(result).toEqual(mockProjects);
      expect(ProjectModel.find).toHaveBeenCalledWith({
        $or: [
          { visibility: { $in: ['PUBLIC', 'OPEN_SOURCE'] } },
          { uid: { $in: ['proj_2'] } },
        ],
      });
    });

    it('doit appliquer le filtre d\'appartenance (requestedOwnerUid) lorsqu\'il est fourni', async () => {
      const mockProjects = [{ uid: 'proj_3', ownerUid: 'owner_99' }];
      
      const mockExecChain = {
        select: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue(mockProjects),
            }),
          }),
        }),
      };

      vi.mocked(ProjectModel.find).mockReturnValue(mockExecChain as any);

      const result = await getCachedProjects('bird_1', 'owner_99', []);

      expect(result).toEqual(mockProjects);
      expect(ProjectModel.find).toHaveBeenCalledWith({
        $and: [
          { ownerUid: 'owner_99' },
          {
            $or: [
              { visibility: { $in: ['PUBLIC', 'OPEN_SOURCE'] } },
              { uid: { $in: [] } },
            ],
          },
        ],
      });
    });
  });

  describe('getCachedProjectDetails', () => {
    it('doit récupérer les détails d\'un projet spécifique en excluant les notes internes', async () => {
      const mockProject = { uid: 'proj_1', title: 'Renouvell' };
      
      const mockExecChain = {
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValueOnce(mockProject),
        }),
      };

      vi.mocked(ProjectModel.findOne).mockReturnValue(mockExecChain as any);

      const result = await getCachedProjectDetails('proj_1');

      expect(result).toEqual(mockProject);
      expect(ProjectModel.findOne).toHaveBeenCalledWith({ uid: 'proj_1' });
      expect(mockExecChain.select).toHaveBeenCalledWith('-moderation.internalNotes');
    });
  });
});