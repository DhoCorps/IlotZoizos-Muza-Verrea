// packages/shared-core/src/sync-engine/__tests__/project.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectOrchestrator } from '../project.orchestrator';
import { TransactionManager } from '../transactionManager';
import { CAPABILITIES, ActionSignature } from '@ilot/types';
import { IlotError } from '../../errors/ilot.errors';

// 🛡️ SUTURE 1 : Mock du modèle ProjectModel (Sédimentation Silice)
vi.mock('../../../../infrastructure/src/database/models/nosql/project.model', () => ({
  ProjectModel: {
    findOne: vi.fn().mockImplementation(() => ({
      // Simule le chaînage Mongoose (.exec()) utilisé dans l'orchestrateur
      exec: vi.fn().mockResolvedValue({ 
        uid: 'proj_123', 
        ownerUid: 'team-777', // Le Nid
        creatorUid: 'bird-alpha-777' // L'Oiseau créateur
      }),
      lean: vi.fn().mockReturnThis()
    })),
    create: vi.fn().mockImplementation((data) => Promise.resolve(Array.isArray(data) ? data : [data])),
    findOneAndUpdate: vi.fn().mockImplementation(() => ({
      lean: vi.fn().mockResolvedValue({ uid: 'proj_123', name: 'Mutation OK' })
    })),
    findOneAndDelete: vi.fn().mockImplementation(() => ({
      lean: vi.fn().mockResolvedValue({ uid: 'proj_123' })
    }))
  }
}));

// 🛡️ SUTURE 2 : Mock de la Transaction (Graphe Sync)
vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn().mockImplementation(async (name, callback) => {
      const mockNeo4jTx = {
        run: vi.fn().mockResolvedValue({ 
          // 🪡 SUTURE : On renvoie un tableau de capacités pour éviter l'erreur .includes()
          records: [{ get: () => [CAPABILITIES.PROJECT.UPDATE] }] 
        })
      };
      return callback(null as any, mockNeo4jTx as any);
    })
  }
}));

describe('ProjectOrchestrator - Fondation de Chantier', () => {
  let orchestrator: ProjectOrchestrator;
  const mockBirdUid = 'bird-alpha-777';
  const mockTeamUid = 'team-777';

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new ProjectOrchestrator();
  });

  it("✅ doit fonder un chantier (fosterProject) quand l'Aura est alignée", async () => {
    // 🪡 SUTURE : Politique Matrioshka - ownerUid (le Nid) est désormais OBLIGATOIRE
    const payload = { 
      name: 'Renewall', 
      status: 'CONCEPT',
      ownerUid: mockTeamUid 
    };
    
    const validSignature: ActionSignature = {
      actorUid: mockBirdUid,
      capabilities: [CAPABILITIES.PROJECT.CREATE] 
    };

    const result = await orchestrator.fosterProject(payload, validSignature);

    expect(result.success).toBe(true);
    expect(result.mongo.name).toBe('Renewall');
    // On vérifie que le propriétaire est bien le Nid transmis
    expect(result.mongo.ownerUid).toBe(mockTeamUid);
    expect(TransactionManager.execute).toHaveBeenCalledWith("Fondation Chantier", expect.any(Function));
  });

  it("❌ doit rejeter la fondation si le Nid (ownerUid) est manquant", async () => {
    const payload = { name: 'Chantier Orphelin' };
    const validSignature: ActionSignature = {
      actorUid: mockBirdUid,
      capabilities: [CAPABILITIES.PROJECT.CREATE]
    };
    
    // 🪡 SUTURE : Test du garde-fou de l'ancrage double
    await expect(orchestrator.fosterProject(payload, validSignature))
      .rejects.toThrow("Un chantier doit être ancré à un Nid");
  });

  it("❌ doit rejeter la fondation si l'Aura est insuffisante", async () => {
    const payload = { name: 'Projet Interdit', ownerUid: mockTeamUid };
    const badSignature: ActionSignature = {
      actorUid: 'bird-imposteur',
      capabilities: [] 
    };
    
    await expect(orchestrator.fosterProject(payload, badSignature))
      .rejects.toThrow("Aura insuffisante pour sceller un chantier");
  });

  it("🚨 doit échouer proprement si le projet est introuvable durant une mutation", async () => {
    const { ProjectModel } = await import('../../../../infrastructure/src/database/models/nosql/project.model');
    (ProjectModel.findOne as any).mockReturnValueOnce(null);

    const adminSignature: ActionSignature = {
      actorUid: mockBirdUid,
      capabilities: ['*'] 
    };

    await expect(orchestrator.mutateProject('inconnu', {}, adminSignature))
      .rejects.toThrow("Chantier introuvable");
  });

  it("🛡️ doit valider le Double Verrou territorial lors d'une mutation", async () => {
    const validSignature: ActionSignature = {
      actorUid: 'bird-invite', // N'est pas le créateur originel
      capabilities: [CAPABILITIES.PROJECT.UPDATE]
    };

    // La mutation doit passer car le mock de Neo4j renvoie les capacités MEMBER_OF suffisantes
    const result = await orchestrator.mutateProject('proj_123', { name: 'New Name' }, validSignature);
    
    expect(result.success).toBe(true);
    expect(TransactionManager.execute).toHaveBeenCalledWith("Mutation Chantier", expect.any(Function));
  });
});