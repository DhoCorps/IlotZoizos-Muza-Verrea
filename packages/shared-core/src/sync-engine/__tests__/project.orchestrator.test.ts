import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectOrchestrator } from '../project.orchestrator';
import { TransactionManager } from '../transactionManager';
import { ProjectModel } from '@ilot/infrastructure';
import { CAPABILITIES, ActionSignature } from '@ilot/types';

// 🛡️ MOCK GLOBAL : Storage Service
vi.mock('../../../../apps/hub-central/modules/storage/storage.service', () => ({
  storageService: {
    extractKeyFromUrl: vi.fn().mockReturnValue('mock-key'),
    deleteFile: vi.fn().mockResolvedValue(true),
  },
}));

// 🛡️ MOCK GLOBAL : Neo4j Driver
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    getNeo4jSession: vi.fn().mockReturnValue({
      run: vi.fn().mockResolvedValue({ records: [] }),
      close: vi.fn().mockResolvedValue(true),
    }),
  };
});

describe('ProjectOrchestrator - Fondation de Chantier', () => {
  let orchestrator: ProjectOrchestrator;
  
  beforeEach(() => { 
    vi.clearAllMocks(); 
    orchestrator = new ProjectOrchestrator(); 

    // 🛡️ SUTURE TRANSACTION : Garantit le retour du résultat du callback
    vi.spyOn(TransactionManager, 'execute').mockImplementation(async (_name, callback) => {
      const mockNeo = { 
        run: vi.fn().mockImplementation((query) => {
          if (query.includes('RETURN r.capabilities AS caps')) {
            return Promise.resolve({ records: [{ get: () => [CAPABILITIES.PROJECT.UPDATE] }] });
          }
          return Promise.resolve({ records: [] });
        })
      };
      return await callback({} as any, mockNeo as any);
    });

    // 🛡️ SUTURE MONGOOSE : Simulation fidèle des requêtes Mongoose (findOne et create)
    vi.spyOn(ProjectModel, 'create').mockImplementation((data: any) => 
      Promise.resolve(Array.isArray(data) ? data : [data]) as any
    );

    const mockProjectDoc = { 
      uid: 'proj_123', 
      creatorUid: 'bird-alpha-777', 
      ownerUid: 'team-777', 
      name: 'Ancien Nom', 
      documents: [],
      session: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({ uid: 'proj_123', creatorUid: 'bird-alpha-777', ownerUid: 'team-777', name: 'Ancien Nom', documents: [] })
    };

    vi.spyOn(ProjectModel, 'findOne').mockReturnValue(mockProjectDoc as any);

    vi.spyOn(ProjectModel, 'findOneAndUpdate').mockReturnValue({
      lean: vi.fn().mockResolvedValue({ uid: 'proj_123', name: 'Mutation OK', status: 'CONCEPT' }),
      exec: vi.fn().mockResolvedValue({ uid: 'proj_123', name: 'Mutation OK', status: 'CONCEPT' }),
    } as any);

    vi.spyOn(ProjectModel, 'deleteOne').mockResolvedValue({ deletedCount: 1 } as any);
  });

  it("✅ doit fonder un chantier", async () => {
    const payload = { name: 'Renewall', ownerUid: 'team-777' };
    const signature: ActionSignature = { actorUid: 'bird-alpha-777', capabilities: [CAPABILITIES.PROJECT.CREATE] };
    
    const result = await orchestrator.fosterProject(payload as any, signature) as any; 
    
    expect(result.success).toBe(true);
    expect(result.mongo.name).toBe('Renewall'); 
  });

  it("🛡️ doit valider le Double Verrou territorial lors d'une mutation", async () => {
    const signature: ActionSignature = { actorUid: 'bird-invite', capabilities: [] };
    
    const result = await orchestrator.mutateProject('proj_123', { name: 'New Name' }, signature) as any;
    
    expect(result.success).toBe(true);
    expect(result.mongo.name).toBe('Mutation OK'); 
  });
});