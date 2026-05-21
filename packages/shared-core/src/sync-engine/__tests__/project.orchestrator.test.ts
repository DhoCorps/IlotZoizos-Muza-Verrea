// packages/shared-core/src/sync-engine/__tests__/project.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectOrchestrator } from '../project.orchestrator';
import { TransactionManager } from '../transactionManager';
import { CAPABILITIES, ActionSignature } from '@ilot/types';

// 🛡️ SUTURE 1 : Mock des modèles Silice (MongoDB)
vi.mock('../../../../infrastructure/src/database/models/nosql/project.model', () => ({
  ProjectModel: {
    findOne: vi.fn().mockImplementation(() => {
      const m: any = Promise.resolve({ uid: 'proj_123', creatorUid: 'bird-alpha-777', ownerUid: 'team-777', name: 'Ancien Nom' });
      m.lean = vi.fn().mockResolvedValue({ uid: 'proj_123', creatorUid: 'bird-alpha-777', ownerUid: 'team-777', name: 'Ancien Nom' });
      m.session = vi.fn().mockResolvedValue({ uid: 'proj_123', creatorUid: 'bird-alpha-777', ownerUid: 'team-777', documents: [] });
      return m;
    }),
    create: vi.fn().mockImplementation((data) => Promise.resolve(Array.isArray(data) ? data : [data])),
    findOneAndUpdate: vi.fn().mockImplementation(() => {
      const m: any = Promise.resolve({ uid: 'proj_123', name: 'Mutation OK', status: 'CONCEPT' });
      m.lean = vi.fn().mockResolvedValue({ uid: 'proj_123', name: 'Mutation OK', status: 'CONCEPT' });
      m.exec = vi.fn().mockResolvedValue({ uid: 'proj_123', name: 'Mutation OK', status: 'CONCEPT' });
      return m;
    }),
    find: vi.fn().mockImplementation(() => {
      const m: any = Promise.resolve([]);
      m.session = vi.fn().mockResolvedValue([]);
      m.lean = vi.fn().mockResolvedValue([]);
      return m;
    }),
    deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }),
    deleteMany: vi.fn().mockResolvedValue({ deletedCount: 1 })
  }
}));

// Mock du Driver Neo4j
vi.mock('../../../../infrastructure/src/database/neo4j', () => ({
  getNeo4jSession: vi.fn().mockReturnValue({
    run: vi.fn().mockResolvedValue({ records: [] }),
    close: vi.fn().mockResolvedValue(true)
  })
}));

// Mock du Storage (S3/R2)
vi.mock('../../../../../apps/hub-central/modules/storage/storage.service', () => ({
  storageService: {
    extractKeyFromUrl: vi.fn().mockReturnValue('mock-key'),
    deleteFile: vi.fn().mockResolvedValue(true)
  }
}));

// 🛡️ SUTURE 2 : Mock du TransactionManager
vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn().mockImplementation(async (name, callback) => {
      const mockNeo = { 
        run: vi.fn().mockImplementation((query) => {
          if (query.includes('RETURN r.capabilities AS caps')) {
            return Promise.resolve({ records: [{ get: () => [CAPABILITIES.PROJECT.UPDATE] }] });
          }
          return Promise.resolve({ records: [] });
        })
      };
      return await callback({} as any, mockNeo as any);
    })
  }
}));

describe('ProjectOrchestrator - Fondation de Chantier', () => {
  let orchestrator: ProjectOrchestrator;
  
  beforeEach(() => { 
    vi.clearAllMocks(); 
    orchestrator = new ProjectOrchestrator(); 
  });

  it("✅ doit fonder un chantier", async () => {
    const payload = { name: 'Renewall', ownerUid: 'team-777' };
    const signature: ActionSignature = { actorUid: 'bird-alpha-777', capabilities: [CAPABILITIES.PROJECT.CREATE] };
    
    // 🪡 SUTURE : Cast en any car ton implémentation retourne 'mongo' et 'neo4j' 
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