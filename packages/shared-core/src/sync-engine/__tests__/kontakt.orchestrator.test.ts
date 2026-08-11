// packages/shared-core/src/sync-engine/__test__/kontakt.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KontaktOrchestrator } from '../kontakt.orchestrator';
import { OiseauModel } from '../../../../infrastructure/src/database/models/nosql/user.model';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';

// Mocks
vi.mock('../../../../infrastructure/src/database/models/nosql/user.model', () => ({
  OiseauModel: {
    findOne: vi.fn(),
  },
}));

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (name, cb) => cb('mock-mongo-session', { run: vi.fn().mockResolvedValue({ records: [{ get: () => ({}) }] }) })),
  },
}));

describe('KontaktOrchestrator - Réseau RH & Swipes', () => {
  let orchestrator: KontaktOrchestrator;
  const validSignature = { actorUid: 'bird_alpha', capabilities: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new KontaktOrchestrator();

    // Simulation de la résolution canonique MongoDB
    vi.mocked(OiseauModel.findOne).mockReturnValue({
      lean: vi.fn().mockImplementation(async () => ({ uid: 'resolved_canonical_uid' }))
    } as any);
  });

  describe('registerSwipe', () => {
    it('🟢 doit enregistrer un swipe LIKE strict (après résolution de l\'uid canonique) et détecter un match', async () => {
      const mockNeo4jTx = {
        run: vi.fn()
          .mockResolvedValueOnce({ records: [{ get: () => ({}) }] }) // Simulation check match = true
          .mockResolvedValueOnce({ records: [] }) // Création
      };

      vi.mocked(TransactionManager.execute).mockImplementationOnce(async (name, cb) => {
        return await cb({} as any, mockNeo4jTx as any);
      });

      const res = await orchestrator.registerSwipe(
        { swiperUid: 'bird_alpha_slug', targetUid: 'bird_beta_slug', action: 'LIKE' },
        validSignature as any
      );

      expect(res.success).toBe(true);
      expect(res.match).toBe(true);
      
      // On s'assure que la Silice a été interrogée deux fois pour résoudre les identités
      expect(OiseauModel.findOne).toHaveBeenCalledTimes(2);
      expect(mockNeo4jTx.run).toHaveBeenCalledTimes(2);
    });
  });

  describe('endorseSkill (Sceau de Confiance)', () => {
    it('🔴 doit rejeter (400) si l\'oiseau tente de s\'auto-attribuer un Sceau', async () => {
      await expect(
        orchestrator.endorseSkill(
          { targetUid: 'bird_alpha', skillName: 'REACT' },
          { actorUid: 'bird_alpha', capabilities: [] } as any
        )
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit apposer le Sceau de Confiance avec succès', async () => {
      const res = await orchestrator.endorseSkill(
        { targetUid: 'target_slug', skillName: 'NEO4J', comment: 'Excellent modélisateur' },
        validSignature as any
      );

      expect(res.success).toBe(true);
      expect(res.skill).toBe('NEO4J');
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('requestIntroduction (La Passerelle)', () => {
    it('🟢 doit enregistrer une demande de mise en relation dans le graphe', async () => {
      const res = await orchestrator.requestIntroduction(
        { intermediaryUid: 'inter_slug', targetUid: 'target_slug', message: 'Hello!' },
        validSignature as any
      );

      expect(res.success).toBe(true);
      expect(res.status).toBe('PENDING');
      expect(OiseauModel.findOne).toHaveBeenCalledTimes(3); // requester, intermediary, target
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });
});