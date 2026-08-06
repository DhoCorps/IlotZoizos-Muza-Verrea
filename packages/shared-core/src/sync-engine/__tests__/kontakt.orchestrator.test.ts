// packages/shared-core/src/sync-engine/__test__/kontakt.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KontaktOrchestrator } from '../kontakt.orchestrator';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (name, cb) => cb('mock-mongo-session', { run: vi.fn().mockResolvedValue({ records: [] }) })),
  },
}));

describe('KontaktOrchestrator', () => {
  let orchestrator: KontaktOrchestrator;
  const validSignature = { actorUid: 'bird_alpha', capabilities: [] };
  const invalidSignature = { capabilities: [] }; // Sans actorUid

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new KontaktOrchestrator();
  });

  describe('registerSwipe', () => {
    it('🔴 doit rejeter (401) si l’Oiseau n’est pas authentifié', async () => {
      await expect(
        orchestrator.registerSwipe({ swiperUid: 'b1', targetUid: 'b2', action: 'LIKE' }, invalidSignature as any)
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit enregistrer un swipe LIKE sans match si la cible n’a pas liké', async () => {
      const res = await orchestrator.registerSwipe(
        { swiperUid: 'bird_alpha', targetUid: 'bird_beta', action: 'LIKE' },
        validSignature as any
      );

      expect(res.success).toBe(true);
      expect(res.action).toBe('LIKE');
      expect(res.match).toBe(false);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });

    it('🟢 doit enregistrer un swipe LIKE et détecter un MATCH si la cible a déjà liké', async () => {
      const mockNeo4jTx = {
        run: vi.fn()
          .mockResolvedValueOnce({ records: [{ get: () => ({}) }] }) // Simulation du check match réussi
          .mockResolvedValueOnce({ records: [] }) // Simulation de l'écriture du swipe/match
      };

      vi.mocked(TransactionManager.execute).mockImplementationOnce(async (name, cb) => {
        // Remplacement de 'mock-mongo' par un objet mocké compatible ClientSession
        return await cb({} as any, mockNeo4jTx as any);
      });

      const res = await orchestrator.registerSwipe(
        { swiperUid: 'bird_alpha', targetUid: 'bird_beta', action: 'LIKE' },
        validSignature as any
      );

      expect(res.success).toBe(true);
      expect(res.match).toBe(true);
      expect(mockNeo4jTx.run).toHaveBeenCalledTimes(2);
    });

    it('🟢 doit enregistrer un swipe PASS avec succès', async () => {
      const res = await orchestrator.registerSwipe(
        { swiperUid: 'bird_alpha', targetUid: 'bird_beta', action: 'PASS' },
        validSignature as any
      );

      expect(res.success).toBe(true);
      expect(res.action).toBe('PASS');
      expect(res.match).toBe(false);
    });
  });
});