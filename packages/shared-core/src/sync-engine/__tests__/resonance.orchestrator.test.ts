// packages/shared-core/src/sync-engine/__tests__/resonance.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { ResonanceOrchestrator } from '../resonance.orchestrator';
import { TransactionManager } from '../transactionManager';
import { connectToDatabase } from '@ilot/infrastructure'; // 🩸 SUTURE : Import de la connexion de la Silice

// Mock du Transaction Manager
vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn().mockImplementation(async (name, callback) => {
      const mockMongoSession = { startTransaction: vi.fn(), commitTransaction: vi.fn(), abortTransaction: vi.fn(), endSession: vi.fn() };
      const mockNeo4jTx = {
        run: vi.fn().mockResolvedValue({ records: [{ get: () => 'link_1' }] })
      };
      return await callback(mockMongoSession as any, mockNeo4jTx as any);
    })
  }
}));

describe('ResonanceOrchestrator - Tisseur de Liens et Échos', () => {
  let orchestrator: ResonanceOrchestrator;
  const mockActorUid = 'bird-alpha-001';

  beforeAll(async () => {
    // Évite le timeout de Mongoose en s'assurant que la Silice est éveillée
    try {
      await connectToDatabase();
    } catch (e) {
      // Ignoré si simulé
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new ResonanceOrchestrator();
  });

  it('🟢 doit tisser un lien transdisciplinaire si l\'Architecte possède l\'aura absolue (*)', async () => {
    const result = await orchestrator.weaveCrossDomainLink(
      'sujet-1',
      'Sujet',
      'prod-1',
      'Product',
      'MENTIONS',
      { actorUid: mockActorUid, capabilities: ['*'], issuedAt: new Date() }
    );
    expect(result.success).toBe(true);
  });

  it('🔴 doit interdire le tissage global si l\'Oiseau ne possède pas l\'aura requise (403)', async () => {
    await expect(
      orchestrator.weaveCrossDomainLink(
        'sujet-1',
        'Sujet',
        'prod-1',
        'Product',
        'MENTIONS',
        { actorUid: mockActorUid, capabilities: [], issuedAt: new Date() }
      )
    ).rejects.toThrow();
  });

  it('🟢 doit enregistrer un écho social avec succès', async () => {
    const result = await orchestrator.addSocialEcho(
      'sujet-1',
      'Sujet',
      'TEXT',
      'Magnifique résonance harmonique.',
      { actorUid: mockActorUid, capabilities: [], issuedAt: new Date() }
    );
    expect(result.success).toBe(true);
    expect(result.content).toBe('Magnifique résonance harmonique.');
    expect(result.type).toBe('TEXT');
  });
});