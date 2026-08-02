// packages/shared-core/src/sync-engine/__tests__/kontakt.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KontaktOrchestrator } from '../kontakt.orchestrator';


vi.mock('mongoose', () => ({
  default: {
    startSession: vi.fn().mockResolvedValue({
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      abortTransaction: vi.fn(),
      endSession: vi.fn(),
    }),
  },
}));
// Mock du TransactionManager pour isoler le test d'intégration du graphe
vi.mock('../../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn().mockImplementation(async (name, callback) => {
      const mockMongoSession = {};
      const mockNeo4jTx = {
        run: vi.fn().mockResolvedValue({ records: [] }) // Pas de match par défaut
      };
      return await callback(mockMongoSession as any, mockNeo4jTx as any);
    })
  }
}));

describe('KontaktOrchestrator - Moteur de Swipe & Match', () => {
  let orchestrator: KontaktOrchestrator;
  const mockActorUid = 'bird-alpha';

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new KontaktOrchestrator();
  });

  it('🟢 doit enregistrer un swipe LIKE sans match si la cible n\'a pas liké en retour', async () => {
    const result = await orchestrator.registerSwipe(
      { swiperUid: 'bird-alpha', targetUid: 'bird-beta', action: 'LIKE' },
      { actorUid: mockActorUid, capabilities: ['*'], issuedAt: new Date() }
    );

    expect(result.success).toBe(true);
    expect(result.action).toBe('LIKE');
    expect(result.match).toBe(false);
  });

  it('🔴 doit rejeter le swipe si l\'Oiseau n\'est pas authentifié (401)', async () => {
    await expect(
      orchestrator.registerSwipe(
        { swiperUid: '', targetUid: 'bird-beta', action: 'LIKE' },
        { actorUid: '', capabilities: [], issuedAt: new Date() }
      )
    ).rejects.toThrow();
  });
});