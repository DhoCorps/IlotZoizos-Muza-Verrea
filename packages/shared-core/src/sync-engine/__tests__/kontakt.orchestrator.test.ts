// Fichier : packages/backend/src/orchestrators/__tests__/kontakt.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KontaktOrchestrator } from '../kontakt.orchestrator';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';
import { ActionSignature } from '@ilot/types';
import * as orchestratorEngine from '../../utils/orchestrator.engine';
import type { ClientSession } from 'mongoose';
import type { Transaction } from 'neo4j-driver';

// 🛡️ Mock unifié et sécurisé de l'infrastructure
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    OiseauModel: {},
  };
});

// Mock complet du moteur d'orchestration (incluant resolveCanonicalUid et safeSyncUniversalInteraction)
vi.mock('../../utils/orchestrator.engine', () => ({
  safeSyncUniversalInteraction: vi.fn(async () => {}),
  resolveCanonicalUid: vi.fn(async (_model, identifier: string) => `resolved_${identifier}`)
}));

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (_name: string, cb: (mongoSession: ClientSession, neo4jTx: Transaction) => Promise<unknown>) => 
      cb({} as ClientSession, { run: vi.fn().mockResolvedValue({ records: [{ get: () => ({}) }] }) } as unknown as Transaction)
    ),
  },
}));

describe('KontaktOrchestrator - Réseau RH & Swipes', () => {
  let orchestrator: KontaktOrchestrator;
  const validSignature: ActionSignature = { actorUid: 'bird_alpha', capabilities: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new KontaktOrchestrator();
  });

  describe('registerSwipe', () => {
    it('🟢 doit enregistrer un swipe LIKE, détecter un match et propager l\'interaction universelle', async () => {
      const mockNeo4jTx = {
        run: vi.fn()
          .mockResolvedValueOnce({ records: [{ get: () => ({}) }] })
          .mockResolvedValueOnce({ records: [] })
      };
      vi.mocked(TransactionManager.execute).mockImplementationOnce(async (_name: string, cb: (mongoSession: ClientSession, neo4jTx: Transaction) => Promise<unknown>) => {
        return await cb({} as ClientSession, mockNeo4jTx as unknown as Transaction);
      });

      const res = await orchestrator.registerSwipe(
        { swiperUid: 'bird_alpha_slug', targetUid: 'bird_beta_slug', action: 'LIKE' },
        validSignature
      );

      expect(res.success).toBe(true);
      expect(res.match).toBe(true);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);

      expect(orchestratorEngine.safeSyncUniversalInteraction).toHaveBeenCalledTimes(1);
      expect(orchestratorEngine.safeSyncUniversalInteraction).toHaveBeenCalledWith(
        'resolved_bird_alpha_slug', 
        'resolved_bird_beta_slug', 
        'KONTAKT',
        'registerSwipe'
      );
    });

    it('🟡 doit appeler safeSyncUniversalInteraction lors d\'un swipe PASS', async () => {
      const mockNeo4jTx = {
        run: vi.fn()
          .mockResolvedValueOnce({ records: [] })
          .mockResolvedValueOnce({ records: [] })
      };
      vi.mocked(TransactionManager.execute).mockImplementationOnce(async (_name: string, cb: (mongoSession: ClientSession, neo4jTx: Transaction) => Promise<unknown>) => {
        return await cb({} as ClientSession, mockNeo4jTx as unknown as Transaction);
      });

      const res = await orchestrator.registerSwipe(
        { swiperUid: 'bird_alpha_slug', targetUid: 'bird_beta_slug', action: 'PASS' },
        validSignature
      );

      expect(res.success).toBe(true);
      expect(orchestratorEngine.safeSyncUniversalInteraction).toHaveBeenCalledTimes(1);
    });
  });

  describe('endorseSkill (Sceau de Confiance)', () => {
    it('🔴 doit rejeter (400) si l\'oiseau tente de s\'auto-attribuer un Sceau', async () => {
      await expect(
        orchestrator.endorseSkill(
          { targetUid: 'bird_alpha', skillName: 'REACT' },
          { actorUid: 'bird_alpha', capabilities: [] }
        )
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit apposer le Sceau de Confiance et propager l\'interaction universelle', async () => {
      const res = await orchestrator.endorseSkill(
        { targetUid: 'target_slug', skillName: 'NEO4J', comment: 'Excellent modélisateur' },
        validSignature
      );

      expect(res.success).toBe(true);
      expect(res.skill).toBe('NEO4J');
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);

      expect(orchestratorEngine.safeSyncUniversalInteraction).toHaveBeenCalledTimes(1);
      expect(orchestratorEngine.safeSyncUniversalInteraction).toHaveBeenCalledWith(
        'resolved_bird_alpha', 
        'resolved_target_slug', 
        'KONTAKT',
        'endorseSkill'
      );
    });
  });

  describe('requestIntroduction (La Passerelle)', () => {
    it('🟢 doit enregistrer une demande et propager l\'interaction universelle avec l\'intermédiaire', async () => {
      const res = await orchestrator.requestIntroduction(
        { intermediaryUid: 'inter_slug', targetUid: 'target_slug', message: 'Hello!' },
        validSignature
      );

      expect(res.success).toBe(true);
      expect(res.status).toBe('PENDING');
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);

      expect(orchestratorEngine.safeSyncUniversalInteraction).toHaveBeenCalledTimes(1);
      expect(orchestratorEngine.safeSyncUniversalInteraction).toHaveBeenCalledWith(
        'resolved_bird_alpha', 
        'resolved_inter_slug', 
        'KONTAKT',
        'requestIntroduction'
      );
    });
  });

  // 🚀 NOUVELLE SUITE DE TESTS POUR LE MATCHMAKING DE BUDGET
  describe('matchmakingEngine (Matchs de Budget Favorables)', () => {
    it('🟢 doit flagger un match favorable (FAVORABLE_BUDGET_MATCH) si le taux horaire rentre dans le budget max', async () => {
      const res = await orchestrator.matchmakingEngine({
        questMaxBudgetCents: 50000,
        profileHourlyRateCents: 6000
      });
      expect(res.isFavorable).toBe(true);
      expect(res.matchFlag).toBe('FAVORABLE_BUDGET_MATCH');
    });

    it('🔴 doit flagger OUT_OF_BUDGET si le taux horaire dépasse le budget max de la quête', async () => {
      const res = await orchestrator.matchmakingEngine({
        questMaxBudgetCents: 4500,
        profileHourlyRateCents: 6000
      });
      expect(res.isFavorable).toBe(false);
      expect(res.matchFlag).toBe('OUT_OF_BUDGET');
    });

    it('🟡 doit retourner MISSING_DATA s\'il manque des informations financières', async () => {
      const res1 = await orchestrator.matchmakingEngine({
        questMaxBudgetCents: 50000
        // profileHourlyRateCents manquant
      });
      const res2 = await orchestrator.matchmakingEngine({}); // Tout est manquant

      expect(res1.isFavorable).toBe(false);
      expect(res1.matchFlag).toBe('MISSING_DATA');
      expect(res2.isFavorable).toBe(false);
      expect(res2.matchFlag).toBe('MISSING_DATA');
    });
  });
});