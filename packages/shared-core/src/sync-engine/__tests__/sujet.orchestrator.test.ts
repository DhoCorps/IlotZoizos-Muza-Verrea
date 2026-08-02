// packages/shared-core/src/sync-engine/__tests__/sujet.orchestrator.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SujetOrchestrator } from '../sujet.orchestrator';
import { TransactionManager } from '../transactionManager';
import { ActionSignature } from '@ilot/types';
import { SujetModel } from '../../../../infrastructure/src/database/models/nosql/sujet.model';

// SUTURE 1 : Mock direct et local du modèle Silice (MongoDB)
vi.mock('../../../../infrastructure/src/database/models/nosql/sujet.model', () => ({
  SujetModel: {
    create: vi.fn().mockImplementation((data) => Promise.resolve(Array.isArray(data) ? data : [data])),
    findOne: vi.fn().mockImplementation(() => {
      const m: any = Promise.resolve({
        uid: 'sujet_123',
        title: 'Ancien Monologue',
        authorUid: 'bird_alpha',
        merchLink: null,
        media: {}
      });
      m.lean = vi.fn().mockResolvedValue({
        uid: 'sujet_123',
        title: 'Ancien Monologue',
        authorUid: 'bird_alpha',
        merchLink: null,
        media: {}
      });
      return m;
    }),
    findOneAndUpdate: vi.fn().mockImplementation(() => {
      const m: any = Promise.resolve({
        uid: 'sujet_123',
        title: 'Monologue Muté',
        authorUid: 'bird_alpha',
        status: 'PUBLISHED',
        merchLink: null
      });
      m.lean = vi.fn().mockResolvedValue({
        uid: 'sujet_123',
        title: 'Monologue Muté',
        authorUid: 'bird_alpha',
        status: 'PUBLISHED',
        merchLink: null
      });
      return m;
    }),
    deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 })
  }
}));

// Mock du Storage (S3/R2)
vi.mock('../../../../../apps/hub-central/modules/storage/storage.service', () => ({
  storageService: {
    extractKeyFromUrl: vi.fn().mockReturnValue('mock-key'),
    deleteFile: vi.fn().mockResolvedValue(true)
  }
}));

// SUTURE 2 : Mock du TransactionManager (Le Graphe Muet)
const mockNeo4jRun = vi.fn();
vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn().mockImplementation(async (name, callback) => {
      const mockNeo4jTx = {
        run: mockNeo4jRun.mockResolvedValue({ records: [] })
      };
      return callback({} as any, mockNeo4jTx as any);
    })
  }
}));

describe("SujetOrchestrator - Tissage de la Pensée", () => {
  let orchestrator: SujetOrchestrator;
  
  const mockAuthorUid = 'bird_alpha';
  const validSignature: ActionSignature = {
    actorUid: mockAuthorUid,
    capabilities: [] 
  };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new SujetOrchestrator();
  });

  it("doit fonder un nœud de pensée par Souveraineté (Auteur) avec liens et e-commerce", async () => {
    const payload = {
      title: 'La naissance de tom§hat§toes',
      content: 'Ceci est un test de fondation.',
      authorUid: mockAuthorUid,
      connections: {
        relatedProjects: ['proj_999']
      },
      merchLink: {
        productId: 'prod_777',
        displayMode: 'card'
      }
    };

    const result = await orchestrator.fosterSujet(payload as any, validSignature);

    expect(result.success).toBe(true);
    expect(SujetModel.create).toHaveBeenCalled();
    expect(mockNeo4jRun).toHaveBeenCalledWith(
      expect.stringContaining("CREATE (s:Sujet"),
      expect.objectContaining({
        title: 'La naissance de tom§hat§toes',
        actorUid: mockAuthorUid,
        productId: 'prod_777'
      })
    );
    expect(mockNeo4jRun).toHaveBeenCalledWith(
      expect.stringContaining("MERGE (s)-[:ILLUMINATES]->(p)"),
      expect.anything()
    );
    expect(mockNeo4jRun).toHaveBeenCalledWith(
      expect.stringContaining("MERGE (s)-[:OFFERS_PRODUCT]->(prod)"),
      expect.anything()
    );
  });

  it("doit rejeter la fondation si un oiseau tente de parler à la place d'un autre", async () => {
    const payload = {
      title: 'Usurpation',
      authorUid: 'bird_beta' 
    };
    const signature: ActionSignature = { actorUid: 'bird_alpha', capabilities: [] };

    await expect(orchestrator.fosterSujet(payload as any, signature))
      .rejects.toThrow("Aura insuffisante pour parler à la place d'un autre.");
  });

  it("doit muter un sujet par son auteur", async () => {
    const result = await orchestrator.updateSujet('sujet_123', { status: 'PUBLISHED' }, validSignature);
    
    expect(result.success).toBe(true);
    expect(result.mongo.status).toBe('PUBLISHED');
    expect(mockNeo4jRun).toHaveBeenCalledWith(
      expect.stringContaining("SET s.title = coalesce"),
      expect.objectContaining({ status: 'PUBLISHED' })
    );
  });

  it("doit rejeter la mutation par un autre oiseau sans l'Aura globale", async () => {
    const badSignature: ActionSignature = { actorUid: 'bird_curieux', capabilities: [] };
    
    await expect(orchestrator.updateSujet('sujet_123', { title: 'Vandalisme' }, badSignature))
      .rejects.toThrow("Tu ne peux modifier que tes propres pensées.");
  });

  it("doit autoriser la désintégration d'un sujet par un Administrateur (Aura globale)", async () => {
    const adminSignature: ActionSignature = { actorUid: 'architect_prime', capabilities: ['*'] };
    
    const result = await orchestrator.disintegrateSujet('sujet_123', adminSignature);
    
    expect(result.success).toBe(true);
    expect(SujetModel.deleteOne).toHaveBeenCalled();
    expect(mockNeo4jRun).toHaveBeenCalledWith(
      expect.stringContaining("DETACH DELETE s"),
      expect.objectContaining({ sujetUid: 'sujet_123' })
    );
  });
});