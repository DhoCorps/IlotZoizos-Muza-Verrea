// packages/shared-core/src/sync-engine/__tests__/user.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OiseauOrchestrator } from '../user.orchestrator'; 
import { TransactionManager } from '../transactionManager';
import { CAPABILITIES, ActionSignature } from '@ilot/types';

// 🛡️ SUTURE 1 : Mock du modèle par son chemin RELATIF exact (4 crans en arrière depuis __tests__)
vi.mock('../../../../infrastructure/src/database/models/nosql/user.model', () => ({
  OiseauModel: {
    findOneAndUpdate: vi.fn().mockImplementation(() => ({
      // .lean() est crucial pour les perfs et la synchronisation
      lean: vi.fn().mockResolvedValue({ 
        uid: 'bird-123', 
        pseudo: 'L_Oiseau_Libre', 
        aura: ['Poésie'],
        frequenceHEX: '#E5484D'
      })
    })),
    findOneAndDelete: vi.fn().mockImplementation(() => ({
      lean: vi.fn().mockResolvedValue({ uid: 'bird-123' })
    })),
    create: vi.fn().mockImplementation((data) => Promise.resolve(Array.isArray(data) ? data : [data]))
  }
}));

// 🛡️ SUTURE 2 : Mock global du TransactionManager (Le Graphe Muet)
vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn().mockImplementation(async (name, callback) => {
      const mockNeo4jTx = { 
        run: vi.fn().mockImplementation((query) => {
          // Si c'est la requête d'exil
          if (query.includes('DETACH DELETE u')) {
            return Promise.resolve({ 
              records: [{ get: () => 1 }] // On simule 1 nœud supprimé
            });
          }
          return Promise.resolve({ records: [] });
        }) 
      };
      
      const result = await callback(null as any, mockNeo4jTx as any);
      return result;
    })
  }
}));

describe("OiseauOrchestrator - L'Intégrité de l'Oiseau", () => {
  let orchestrator: OiseauOrchestrator;

  const mockOiseau = {
    uid: 'bird-123',
    pseudo: 'L_Oiseau_Libre',
    aura: ['TypeScript', 'Poésie'],
    frequenceHEX: '#E5484D'
  };

  const mockSignature: ActionSignature = {
    actorUid: 'bird-123',
    capabilities: [CAPABILITIES.MEMBER?.UPDATE || 'MEMBER.UPDATE'] 
  };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new OiseauOrchestrator();
  });

  it("✅ doit synchroniser l'identité totale sans perte de données via une signature valide", async () => {
    // L'envol de l'Oiseau
    const result = await orchestrator.syncOiseau(mockOiseau as any, mockSignature);

    expect(result.success).toBe(true);
    expect(result.mongo.pseudo).toBe('L_Oiseau_Libre');
    
    // On vérifie que le TransactionManager a bien été sollicité
    expect(TransactionManager.execute).toHaveBeenCalledWith("L'Envol de l'Oiseau", expect.any(Function));
  });

  it("❌ doit rejeter l'action si la signature ne possède pas l'Aura requise", async () => {
    const badSignature: ActionSignature = {
      actorUid: 'bird-malicious',
      capabilities: [] 
    };

    // La barrière karmique doit s'activer [cite: 2026-02-11]
    await expect(
      orchestrator.syncOiseau(mockOiseau as any, badSignature)
    ).rejects.toThrow("Aura insuffisante");
  });
});