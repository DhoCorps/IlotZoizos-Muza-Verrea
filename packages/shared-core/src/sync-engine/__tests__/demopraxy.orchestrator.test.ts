// packages/shared-core/src/sync-engine/__test__/demopraxy.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DemopraxyOrchestrator, NuisanceMetrics } from '../demopraxy.orchestrator';
import { OiseauModel } from '../../../../infrastructure/src/database/models/nosql/user.model';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';

vi.mock('../../../../infrastructure/src/database/models/nosql/user.model', () => ({
  OiseauModel: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (name, cb) => cb('mock-mongo-session', { run: vi.fn().mockResolvedValue(true) })),
  },
}));

describe('DemopraxyOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateExclusionThreshold & evaluateSanctuarySafety', () => {
    it('🟢 doit calculer un score d’exclusion faible et maintenir la sécurité sous le seuil', () => {
      const metrics: NuisanceMetrics = {
        systemicHatredScore: 2,
        recurrenceCount: 1,
        recalibrationCapacity: 8,
        collectiveResonance: 5,
      };

      const score = DemopraxyOrchestrator.calculateExclusionThreshold(metrics);
      expect(score).toBe(0.25);

      const evaluation = DemopraxyOrchestrator.evaluateSanctuarySafety(metrics);
      expect(evaluation.isExcluded).toBe(false);
      expect(evaluation.actionMessage).toContain('Flux sous le seuil critique');
    });

    it('🔴 doit déclencher l’exclusion si le seuil critique (>= 15) est atteint', () => {
      const metrics: NuisanceMetrics = {
        systemicHatredScore: 9,
        recurrenceCount: 3,
        recalibrationCapacity: 1, // Capacité d'évolution minime
        collectiveResonance: -5,
      };

      const score = DemopraxyOrchestrator.calculateExclusionThreshold(metrics);
      expect(score).toBe(27); // (9 * 3) / 1 = 27

      const evaluation = DemopraxyOrchestrator.evaluateSanctuarySafety(metrics);
      expect(evaluation.isExcluded).toBe(true);
      expect(evaluation.actionMessage).toContain('Seuil d\'exclusion atteint');
    });
  });

  describe('processDemopraxicEvaluation', () => {
    it('🔴 doit rejeter (403) si l’Oiseau n’a pas les capacités requises', async () => {
      const orchestrator = new DemopraxyOrchestrator();
      const badSignature = { uid: 'u1', role: 'bird', capabilities: ['read:public'] };

      await expect(
        orchestrator.processDemopraxicEvaluation('oiseau-test', { systemicHatredScore: 5, recurrenceCount: 1, recalibrationCapacity: 5, collectiveResonance: 0 }, badSignature as any)
      ).rejects.toThrow(IlotError);
    });

    it('🔴 doit lever une erreur 404 si l’Oiseau est introuvable dans la Silice', async () => {
      vi.mocked(OiseauModel.findOne).mockResolvedValueOnce(null);

      const orchestrator = new DemopraxyOrchestrator();
      const adminSignature = { uid: 'admin-1', role: 'architect', capabilities: ['*'] };

      await expect(
        orchestrator.processDemopraxicEvaluation('inconnu', { systemicHatredScore: 5, recurrenceCount: 1, recalibrationCapacity: 5, collectiveResonance: 0 }, adminSignature as any)
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit évaluer, verrouiller dans la Silice et propager l’exclusion dans Neo4j avec succès', async () => {
      const mockUser = {
        uid: 'user-uid-999',
        slug: 'oiseau-toxique',
        pseudo: 'Toxique',
      };

      vi.mocked(OiseauModel.findOne).mockResolvedValueOnce(mockUser as any);
      vi.mocked(OiseauModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce({ ...mockUser, sanctuaireVerrouille: true }),
      } as any);

      const orchestrator = new DemopraxyOrchestrator();
      const adminSignature = { uid: 'admin-1', role: 'architect', capabilities: ['*'] };

      const metrics: NuisanceMetrics = {
        systemicHatredScore: 8,
        recurrenceCount: 3,
        recalibrationCapacity: 1,
        collectiveResonance: -2,
      };

      const res = await orchestrator.processDemopraxicEvaluation('oiseau-toxique', metrics, adminSignature as any);

      expect(res.success).toBe(true);
      expect(res.isExcluded).toBe(true);
      expect(res.targetSlug).toBe('oiseau-toxique');
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
      expect(OiseauModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
    });
  });
});