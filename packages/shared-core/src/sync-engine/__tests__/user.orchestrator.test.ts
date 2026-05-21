// packages/shared-core/src/sync-engine/__tests__/user.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OiseauOrchestrator } from '../user.orchestrator';
import { TransactionManager } from '../transactionManager';
import { CAPABILITIES, ActionSignature } from '@ilot/types';

// 🛡️ SUTURE 1 : Mock des modèles Silice (MongoDB)
// On retourne des POJO (objets purs) pour éliminer définitivement l'erreur FlattenMaps
vi.mock('../../../../infrastructure/src/database/models/nosql/user.model', () => ({
  OiseauModel: {
    create: vi.fn().mockImplementation((data) => Promise.resolve(Array.isArray(data) ? data : [data])),
    findOne: vi.fn().mockImplementation(() => ({
      lean: vi.fn().mockResolvedValue({ 
        uid: 'bird-123', 
        pseudo: 'L_Oiseau_Libre', 
        frequenceHEX: '#E5484D',
        teams: [] 
      })
    })),
    findOneAndUpdate: vi.fn().mockImplementation(() => ({
      lean: vi.fn().mockResolvedValue({ 
        uid: 'bird-123', 
        pseudo: 'L_Oiseau_Libre',
        capabilities: ['*'] 
      })
    })),
    findOneAndDelete: vi.fn().mockImplementation(() => ({
      lean: vi.fn().mockResolvedValue({ uid: 'bird-123' })
    }))
  }
}));

// Mock des dépendances pour l'exil (cascade)
vi.mock('../../../../infrastructure/src/database/models/nosql/project.model', () => ({
  ProjectModel: { find: vi.fn().mockReturnValue({ session: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue([]) }) }
}));
vi.mock('../../../../infrastructure/src/database/models/nosql/task.model', () => ({
  TaskModel: { find: vi.fn().mockReturnValue({ session: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue([]) }) }
}));

// 🛡️ SUTURE 2 : Mock du TransactionManager (Le Graphe Muet)
vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn().mockImplementation(async (name, callback) => {
      const mockNeo4jTx = {
        run: vi.fn().mockResolvedValue({ records: [] }) 
      };
      // On passe un mock de session vide
      return callback({} as any, mockNeo4jTx as any);
    })
  }
}));

describe("OiseauOrchestrator - L'Intégrité de l'Oiseau", () => {
  let orchestrator: OiseauOrchestrator;

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new OiseauOrchestrator();
  });

  it("✅ doit fonder un oiseau et retourner l'objet Mongo", async () => {
    const mockBird = {
      email: 'test@ilot.zoizos',
      pseudo: 'Oiseau_Beta',
      password: 'password123'
    };

    const result = await orchestrator.fosterOiseau(mockBird);

    expect(result.success).toBe(true);
    expect(result.mongo.pseudo).toBe('Oiseau_Beta');
    expect(TransactionManager.execute).toHaveBeenCalledWith("Éclosion d'Oiseau", expect.any(Function));
  });

  it("✅ doit synchroniser l'identité totale via une signature valide", async () => {
    const mockOiseau = {
      uid: 'bird-123',
      pseudo: 'L_Oiseau_Libre',
      frequenceHEX: '#E5484D'
    };

    const mockSignature: ActionSignature = {
      actorUid: 'bird-123',
      capabilities: [CAPABILITIES.MEMBER.UPDATE] 
    };

    const result = await orchestrator.syncOiseau(mockOiseau as any, mockSignature);

    expect(result.success).toBe(true);
    expect(result.mongo.pseudo).toBe('L_Oiseau_Libre');
    expect(TransactionManager.execute).toHaveBeenCalledWith("L'Envol de l'Oiseau", expect.any(Function));
  });

  it("❌ doit rejeter l'action si la signature ne possède pas l'Aura requise", async () => {
    const mockOiseau = { uid: 'bird-123', pseudo: 'Pirate' };
    const badSignature: ActionSignature = {
      actorUid: 'bird-malicious',
      capabilities: [] 
    };

    // La barrière karmique doit s'activer
    await expect(
      orchestrator.syncOiseau(mockOiseau as any, badSignature)
    ).rejects.toThrow("Aura insuffisante");
  });
});