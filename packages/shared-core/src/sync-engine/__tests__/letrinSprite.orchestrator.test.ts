import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { LetrinSpriteOrchestrator } from '../letrinSprite.orchestrator';
import { TransactionManager } from '../transactionManager';
import { connectToDatabase } from '@ilot/infrastructure';

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn().mockImplementation(async (name, callback) => {
      const mockMongoSession = { startTransaction: vi.fn(), commitTransaction: vi.fn(), abortTransaction: vi.fn(), endSession: vi.fn() };
      const mockNeo4jTx = {
        run: vi.fn().mockResolvedValue({ records: [{ get: () => 'font-001' }] })
      };
      return await callback(mockMongoSession as any, mockNeo4jTx as any);
    })
  }
}));

describe('LetrinSpriteOrchestrator - Synchronisation Police & Sprites', () => {
  let orchestrator: LetrinSpriteOrchestrator;
  const mockActorUid = 'bird-alpha-001';

  beforeAll(async () => {
    try {
      await connectToDatabase();
    } catch (e) {}
  });

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new LetrinSpriteOrchestrator();
  });

  it('🟢 doit sédimenter une police de sprites avec succès', async () => {
    const result = await orchestrator.publishFontSprite(
      {
        uid: 'font-001',
        name: 'Chantier Pixels',
        slug: 'chantier-pixels', // 🪡
        authorUid: mockActorUid,
        gridSize: { width: 16, height: 16 },
        glyphs: []
      },
      { actorUid: mockActorUid, capabilities: ['*'], issuedAt: new Date() }
    );

    expect(result.success).toBe(true);
    expect(result.uid).toBe('font-001');
    expect(result.name).toBe('Chantier Pixels');
  });

  it('🔴 doit rejeter la sédimentation si l’Oiseau n’est pas authentifié (401)', async () => {
    await expect(
      orchestrator.publishFontSprite(
        {
          uid: 'font-002',
          name: 'Erreur',
          slug: 'erreur', // 🪡
          authorUid: '',
          gridSize: { width: 16, height: 16 },
          glyphs: []
        },
        { actorUid: '', capabilities: [], issuedAt: new Date() }
      )
    ).rejects.toThrow();
  });
});