import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectOrchestrator } from '../project.orchestrator';
import { TransactionManager } from '../transactionManager';
import { ProjectModel, TaskModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { CAPABILITIES, ActionSignature } from '@ilot/types';
import { IlotError } from '../../errors/ilot.errors';

// MOCKS GLOBAUX
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    ProjectModel: {
      findOneAndUpdate: vi.fn(),
      create: vi.fn(),
      find: vi.fn(),
      deleteMany: vi.fn(),
    },
    TaskModel: {
      find: vi.fn(),
      deleteMany: vi.fn(),
    },
    findEntityBySlugOrUid: vi.fn(),
    getNeo4jSession: vi.fn().mockReturnValue({
      run: vi.fn().mockResolvedValue({ records: [] }),
      close: vi.fn().mockResolvedValue(true),
    }),
  };
});

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (_name, callback) => {
      const mockNeo = { 
        run: vi.fn().mockImplementation((query) => {
          if (query.includes('RETURN r.capabilities AS caps')) {
            return Promise.resolve({ records: [{ get: () => [CAPABILITIES.PROJECT.UPDATE] }] });
          }
          if (query.includes('RETURN collect(DISTINCT sub.uid) AS projUids')) {
            return Promise.resolve({ 
              records: [{
                get: (field: string) => field === 'projUids' ? ['proj_123'] : ['task_1']
              }] 
            });
          }
          return Promise.resolve({ records: [{ get: () => 'mock_node' }] }); 
        })
      };
      return await callback({} as any, mockNeo as any);
    }),
  },
}));

describe('ProjectOrchestrator - Architecture de Chantier (Phase 3)', () => {
  let orchestrator: ProjectOrchestrator;
  
  // 💉 Injection de notre faux gestionnaire de stockage
  const mockStorageManager = {
    extractKeyFromUrl: vi.fn((url) => `key_${url}`),
    deleteFile: vi.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Instanciation propre avec notre dépendance
    orchestrator = new ProjectOrchestrator(mockStorageManager);
  });

  describe('fosterProject (Création)', () => {
    it("⚡ doit rejeter (403) si l'Oiseau n'a pas les droits de création", async () => {
      const signature: ActionSignature = { actorUid: 'bird_1', capabilities: [] };
      await expect(orchestrator.fosterProject({ ownerUid: 'team_1' } as any, signature)).rejects.toThrow(IlotError);
    });

    it("🧱 doit fonder un chantier et le lier au nid et au créateur dans le graphe", async () => {
      const payload = { name: 'Renewall', ownerUid: 'team-777' };
      const signature: ActionSignature = { actorUid: 'bird-alpha-777', capabilities: [CAPABILITIES.PROJECT.CREATE] };
      
      vi.mocked(ProjectModel.create).mockResolvedValueOnce([{ uid: 'proj_new', name: 'Renewall', slug: 'renewall' }] as any);
      
      const result = await orchestrator.fosterProject(payload as any, signature);
      
      expect(result.success).toBe(true);
      expect(result.mongo.name).toBe('Renewall');
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('mutateProject (Mise à jour)', () => {
    it("🧬 doit valider le Double Verrou territorial via Neo4j et mettre à jour", async () => {
      const signature: ActionSignature = { actorUid: 'bird-invite', capabilities: [] }; // Pas root, pas creator
      
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ uid: 'proj_123', creatorUid: 'other_bird' } as any);
      vi.mocked(ProjectModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 'proj_123', name: 'Mutation OK', status: 'CONCEPT' })
      } as any);

      const result = await orchestrator.mutateProject('proj-slug', { name: 'New Name' }, signature);
      
      expect(result.success).toBe(true);
      expect(result.mongo.name).toBe('Mutation OK'); 
    });
  });

  describe('dissolveProject (Purge Récursive en Masse)', () => {
    it("🌋 doit désintégrer le chantier entier (Projets + Tâches) sans boucles de sous-transactions", async () => {
      const signature: ActionSignature = { actorUid: 'architect_root', capabilities: ['*'] };
      
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ uid: 'proj_123' } as any);
      
      // Mocks des documents pour tester la purge S3
      vi.mocked(TaskModel.find).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        session: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([{ uid: 'task_1', documents: [{ url: 'http://cdn/task.pdf' }] }])
      } as any);

      vi.mocked(ProjectModel.find).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        session: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([{ uid: 'proj_123', documents: [{ url: 'http://cdn/proj.png' }] }])
      } as any);

      const result = await orchestrator.dissolveProject('proj_123', signature);

      expect(result.success).toBe(true);
      expect(result.purgedCount).toBe(2);
      expect(TaskModel.deleteMany).toHaveBeenCalledWith({ uid: { $in: ['task_1'] } }, expect.any(Object));
      expect(ProjectModel.deleteMany).toHaveBeenCalledWith({ uid: { $in: ['proj_123'] } }, expect.any(Object));
      
      // Vérification du nettoyage asynchrone du stockage via notre mock injecté
      expect(mockStorageManager.extractKeyFromUrl).toHaveBeenCalledTimes(2);
      expect(mockStorageManager.deleteFile).toHaveBeenCalledTimes(2);
    });
  });
});