// packages/shared-core/src/sync-engine/__tests__/kontakt.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KontaktOrchestrator } from '../kontakt.orchestrator';
import { OiseauModel } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';
import { syncUniversalInteraction } from '@ilot/infrastructure';

// 🛡️ Mock unifié et sécurisé de l'infrastructure
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    OiseauModel: {
      findOne: vi.fn(),
    },
    syncUniversalInteraction: vi.fn(async () => true),
  };
});

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
    
    // Simulation dynamique pour différencier les UIDs lors des appels à resolveCanonicalUid
    vi.mocked(OiseauModel.findOne).mockImplementation(({ $or }: any) => {
      const identifier = $or[0].slug || $or[1].uid || 'unknown';
      return {
        lean: vi.fn().mockImplementation(async () => ({ uid: `resolved_${identifier}` }))
      } as any;
    });
  });

  describe('registerSwipe', () => {
    it('🟢 doit enregistrer un swipe LIKE, détecter un match et propager l\'interaction universelle', async () => {
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
      expect(OiseauModel.findOne).toHaveBeenCalledTimes(2);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);

      // Vérification du tissage universel !
      expect(syncUniversalInteraction).toHaveBeenCalledTimes(1);
      expect(syncUniversalInteraction).toHaveBeenCalledWith('resolved_bird_alpha_slug', 'resolved_bird_beta_slug', 'KONTAKT');
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

      // Vérification du tissage universel !
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
      expect(OiseauModel.findOne).toHaveBeenCalledTimes(3); 
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);

      // Vérification du tissage universel (Demandeur <-> Intermédiaire) !
      expect(syncUniversalInteraction).toHaveBeenCalledTimes(1);
      expect(syncUniversalInteraction).toHaveBeenCalledWith('resolved_bird_alpha', 'resolved_inter_slug', 'KONTAKT');
    });
  });
});