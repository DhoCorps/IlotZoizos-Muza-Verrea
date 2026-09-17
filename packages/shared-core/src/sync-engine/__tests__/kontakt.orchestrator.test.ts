import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KontaktOrchestrator } from '../kontakt.orchestrator';
import { OiseauModel, findEntityBySlugOrUid, SystemGraphDlqModel, syncUniversalInteraction } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';

// 🛡️ Mock unifié et sécurisé de l'infrastructure incluant la DLQ
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    OiseauModel: {},
    findEntityBySlugOrUid: vi.fn(),
    syncUniversalInteraction: vi.fn(async () => true),
    SystemGraphDlqModel: {
      create: vi.fn().mockResolvedValue([{}])
    }
  };
});

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (_name, cb) => cb('mock-mongo-session', { run: vi.fn().mockResolvedValue({ records: [{ get: () => ({}) }] }) })),
  },
}));

describe('KontaktOrchestrator - Réseau RH & Swipes', () => {
  let orchestrator: KontaktOrchestrator;
  const validSignature = { actorUid: 'bird_alpha', capabilities: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new KontaktOrchestrator();
    
    vi.mocked(findEntityBySlugOrUid).mockImplementation(async (_model, identifier: any) => {
      const clean = identifier || 'unknown';
      return { uid: `resolved_${clean}` } as any;
    });
  });

  describe('registerSwipe', () => {
    it('🟢 doit enregistrer un swipe LIKE, détecter un match et propager l\'interaction universelle', async () => {
      const mockNeo4jTx = {
        run: vi.fn()
          .mockResolvedValueOnce({ records: [{ get: () => ({}) }] })
          .mockResolvedValueOnce({ records: [] })
      };
      vi.mocked(TransactionManager.execute).mockImplementationOnce(async (_name, cb) => {
        return await cb({} as any, mockNeo4jTx as any);
      });

      const res = await orchestrator.registerSwipe(
        { swiperUid: 'bird_alpha_slug', targetUid: 'bird_beta_slug', action: 'LIKE' },
        validSignature as any
      );

      expect(res.success).toBe(true);
      expect(res.match).toBe(true);
      expect(findEntityBySlugOrUid).toHaveBeenCalledTimes(2);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);

      expect(syncUniversalInteraction).toHaveBeenCalledTimes(1);
      expect(syncUniversalInteraction).toHaveBeenCalledWith('resolved_bird_alpha_slug', 'resolved_bird_beta_slug', 'KONTAKT');
    });

    it('🟡 doit basculer l\'interaction en DLQ si syncUniversalInteraction échoue sur registerSwipe', async () => {
      vi.mocked(syncUniversalInteraction).mockRejectedValueOnce(new Error('Neo4j connection lost'));

      const mockNeo4jTx = {
        run: vi.fn()
          .mockResolvedValueOnce({ records: [] })
          .mockResolvedValueOnce({ records: [] })
      };
      vi.mocked(TransactionManager.execute).mockImplementationOnce(async (_name, cb) => {
        return await cb({} as any, mockNeo4jTx as any);
      });

      const res = await orchestrator.registerSwipe(
        { swiperUid: 'bird_alpha_slug', targetUid: 'bird_beta_slug', action: 'PASS' },
        validSignature as any
      );

      expect(res.success).toBe(true);
      expect(SystemGraphDlqModel.create).toHaveBeenCalledTimes(1);
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

    it('🟢 doit apposer le Sceau de Confiance et propager l\'interaction universelle', async () => {
      const res = await orchestrator.endorseSkill(
        { targetUid: 'target_slug', skillName: 'NEO4J', comment: 'Excellent modélisateur' },
        validSignature as any
      );

      expect(res.success).toBe(true);
      expect(res.skill).toBe('NEO4J');
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);

      expect(syncUniversalInteraction).toHaveBeenCalledTimes(1);
      expect(syncUniversalInteraction).toHaveBeenCalledWith('resolved_bird_alpha', 'resolved_target_slug', 'KONTAKT');
    });
  });

  describe('requestIntroduction (La Passerelle)', () => {
    it('🟢 doit enregistrer une demande et propager l\'interaction universelle avec l\'intermédiaire', async () => {
      const res = await orchestrator.requestIntroduction(
        { intermediaryUid: 'inter_slug', targetUid: 'target_slug', message: 'Hello!' },
        validSignature as any
      );

      expect(res.success).toBe(true);
      expect(res.status).toBe('PENDING');
      expect(findEntityBySlugOrUid).toHaveBeenCalledTimes(3); 
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);

      expect(syncUniversalInteraction).toHaveBeenCalledTimes(1);
      expect(syncUniversalInteraction).toHaveBeenCalledWith('resolved_bird_alpha', 'resolved_inter_slug', 'KONTAKT');
    });
  });
});