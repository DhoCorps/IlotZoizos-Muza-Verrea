import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PartitaOrchestrator } from '../partita.orchestrator';
import { TransactionManager } from '../transactionManager';
import { ActionSignature } from '@ilot/types';
import { PartitaModel } from '../../../../infrastructure/src/database/models/nosql/partita.model';

vi.mock('../../../../infrastructure/src/database/models/nosql/partita.model', () => ({
  PartitaModel: {
    create: vi.fn().mockImplementation((data) => Promise.resolve(Array.isArray(data) ? data : [data])),
    findOne: vi.fn().mockImplementation(() => {
      const m: any = Promise.resolve({
        uid: 'partita_123',
        title: 'Ancienne Tablature',
        authorUid: 'bird_alpha',
        merchLink: null,
        media: {}
      });
      m.lean = vi.fn().mockResolvedValue({
        uid: 'partita_123',
        title: 'Ancienne Tablature',
        authorUid: 'bird_alpha',
        merchLink: null,
        media: {}
      });
      // 🪡 LA CORRECTION : Ajout de la méthode .session() chaînable pour Mongoose
      m.session = vi.fn().mockResolvedValue(null);
      return m;
    }),
    findOneAndUpdate: vi.fn().mockImplementation(() => {
      const m: any = Promise.resolve({
        uid: 'partita_123',
        title: 'Tablature Mutée',
        authorUid: 'bird_alpha',
        status: 'PUBLISHED',
        merchLink: null
      });
      m.lean = vi.fn().mockResolvedValue({
        uid: 'partita_123',
        title: 'Tablature Mutée',
        authorUid: 'bird_alpha',
        status: 'PUBLISHED',
        merchLink: null
      });
      m.session = vi.fn().mockResolvedValue(null);
      return m;
    }),
    deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 })
  }
}));

vi.mock('../../../../../apps/hub-central/modules/storage/storage.service', () => ({
  storageService: {
    extractKeyFromUrl: vi.fn().mockReturnValue('mock-key'),
    deleteFile: vi.fn().mockResolvedValue(true)
  }
}));

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

describe("PartitaOrchestrator - Tissage de la Partition", () => {
  let orchestrator: PartitaOrchestrator;
  
  const mockAuthorUid = 'bird_alpha';
  const validSignature: ActionSignature = {
    actorUid: mockAuthorUid,
    capabilities: [] 
  };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new PartitaOrchestrator();
  });

  it("doit fonder un nœud de partition par Souveraineté (Auteur) avec liens et e-commerce", async () => {
    const payload = {
      title: 'Ligne de Basse Fretless',
      content: 'C: E1 A1 D2 G2 | G2 D2 A1 E1',
      instrument: 'BASS',
      authorUid: mockAuthorUid,
      connections: {
        relatedProjects: ['proj_999']
      },
      merchLink: {
        productId: 'prod_bass_777',
        displayMode: 'card'
      }
    };

    const result = await orchestrator.fosterPartita(payload as any, validSignature);

    expect(result.success).toBe(true);
    expect(PartitaModel.create).toHaveBeenCalled();
    expect(mockNeo4jRun).toHaveBeenCalledWith(
      expect.stringContaining("CREATE (p:Partita"),
      expect.objectContaining({
        title: 'Ligne de Basse Fretless',
        actorUid: mockAuthorUid,
        productId: 'prod_bass_777'
      })
    );
    expect(mockNeo4jRun).toHaveBeenCalledWith(
      expect.stringContaining("MERGE (p)-[:ILLUMINATES]->(proj)"),
      expect.anything()
    );
    expect(mockNeo4jRun).toHaveBeenCalledWith(
      expect.stringContaining("MERGE (p)-[:OFFERS_PRODUCT]->(prod)"),
      expect.anything()
    );
  });

  it("doit rejeter la fondation si un oiseau tente de composer à la place d'un autre", async () => {
    const payload = {
      title: 'Usurpation Musicale',
      authorUid: 'bird_beta' 
    };
    const signature: ActionSignature = { actorUid: 'bird_alpha', capabilities: [] };

    await expect(orchestrator.fosterPartita(payload as any, signature))
      .rejects.toThrow("Aura insuffisante pour composer à la place d'un autre.");
  });

  it("doit muter une partition par son auteur", async () => {
    const result = await orchestrator.updatePartita('partita_123', { status: 'PUBLISHED' }, validSignature);
    
    expect(result.success).toBe(true);
    expect(result.mongo.status).toBe('PUBLISHED');
    expect(mockNeo4jRun).toHaveBeenCalledWith(
      expect.stringContaining("SET p.title = coalesce"),
      expect.objectContaining({ status: 'PUBLISHED' })
    );
  });

  it("doit autoriser la désintégration d'une partition par un Administrateur", async () => {
    const adminSignature: ActionSignature = { actorUid: 'architect_prime', capabilities: ['*'] };
    
    const result = await orchestrator.disintegratePartita('partita_123', adminSignature);
    
    expect(result.success).toBe(true);
    expect(PartitaModel.deleteOne).toHaveBeenCalled();
    expect(mockNeo4jRun).toHaveBeenCalledWith(
      expect.stringContaining("DETACH DELETE p"),
      expect.objectContaining({ partitaUid: 'partita_123' })
    );
  });
});