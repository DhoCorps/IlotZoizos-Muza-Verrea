import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DemopraxyOrchestrator, NuisanceMetrics } from '../demopraxy.orchestrator';
import { OiseauModel, DemopraxyModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    OiseauModel: {
      findOneAndUpdate: vi.fn(),
    },
    DemopraxyModel: {
      create: vi.fn(),
      find: vi.fn(),
      countDocuments: vi.fn(),
    },
    findEntityBySlugOrUid: vi.fn(),
  };
});

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (_name, _cb) => _cb('mock-mongo-session', { run: vi.fn().mockResolvedValue(true) })),
  },
}));

describe('DemopraxyOrchestrator - Modération Démopraxique', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 🛡️ Chaînage Mongoose robuste pour find() et countDocuments()
    vi.mocked(DemopraxyModel.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([{ uid: 'demo_1', sanctionCategory: 'TOXICITY' }]),
          }),
        }),
      }),
    } as any);

    vi.mocked(DemopraxyModel.countDocuments).mockResolvedValue(1 as any);
  });

  describe('Algorithmes de Calcul (Seuil et Sécurité)', () => {
    it('🟢 doit calculer un score d\'exclusion faible et maintenir la sécurité sous le seuil', () => {
      const metrics: NuisanceMetrics = {
        systemicHatredScore: 2,
        recurrenceCount: 1,
        recalibrationCapacity: 8,
        collectiveResonance: 5,
      };
      const score = DemopraxyOrchestrator.calculateExclusionThreshold(metrics);
      expect(score).toBe(0.25); // (2 * 1) / 8 = 0.25

      const evaluation = DemopraxyOrchestrator.evaluateSanctuarySafety(metrics);
      expect(evaluation.isExcluded).toBe(false);
      expect(evaluation.actionMessage).toContain('Flux sous le seuil critique');
    });

    it('🔴 doit déclencher l\'exclusion si le seuil critique (>= 15) est atteint', () => {
      const metrics: NuisanceMetrics = {
        systemicHatredScore: 9,
        recurrenceCount: 3,
        recalibrationCapacity: 1, // Capacité d'évolution très faible
        collectiveResonance: -5,
      };
      const score = DemopraxyOrchestrator.calculateExclusionThreshold(metrics);
      expect(score).toBe(27); // (9 * 3) / 1 = 27

      const evaluation = DemopraxyOrchestrator.evaluateSanctuarySafety(metrics);
      expect(evaluation.isExcluded).toBe(true);
      expect(evaluation.actionMessage).toContain('Seuil d\'exclusion atteint');
    });
  });

  describe('getDemopraxicMetrics & getDemopraxicRegister (Auscultation & Registre)', () => {
    it('🟢 doit retourner les métriques de l\'oiseau si trouvé', async () => {
      const mockUser = {
        uid: 'bird_1',
        slug: 'oiseau-libre',
        sanctuaryVerrouille: false,
        demopraxyState: { lastExScore: 1.2 },
      };

      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(mockUser as any);

      const orchestrator = new DemopraxyOrchestrator();
      const metrics = await orchestrator.getDemopraxicMetrics('oiseau-libre');

      expect(metrics.uid).toBe('bird_1');
      expect(metrics.sanctuaryVerrouille).toBe(false);
    });

    it('🔴 doit lever une erreur 404 si l\'oiseau n\'existe pas', async () => {
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(null);

      const orchestrator = new DemopraxyOrchestrator();
      await expect(orchestrator.getDemopraxicMetrics('inconnu')).rejects.toThrow(IlotError);
    });

    it('🟢 doit récupérer l\'historique paginé du registre démopraxique', async () => {
      const mockRecords = [{ uid: 'demo_1', sanctionCategory: 'TOXICITY' }];
      vi.mocked(DemopraxyModel.find).mockReturnValueOnce({
        sort: vi.fn().mockReturnValueOnce({
          skip: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockReturnValueOnce({
              lean: vi.fn().mockResolvedValueOnce(mockRecords),
            }),
          }),
        }),
      } as any);
      vi.mocked(DemopraxyModel.countDocuments).mockResolvedValueOnce(1 as any);

      const orchestrator = new DemopraxyOrchestrator();
      const result = await orchestrator.getDemopraxicRegister({ page: 1, limit: 10, sanctionCategory: 'TOXICITY' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRecords);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });
  });

  describe('processDemopraxicEvaluation (Double Scellement & Registre)', () => {
    const adminSignature = { actorUid: 'admin-1', capabilities: ['*'] };
    const restrictedSignature = { actorUid: 'u1', capabilities: ['READ'] };

    it('🔴 doit rejeter (403) si l\'Oiseau n\'a pas les capacités requises', async () => {
      const orchestrator = new DemopraxyOrchestrator();
      await expect(
        orchestrator.processDemopraxicEvaluation(
          'oiseau-test',
          { systemicHatredScore: 5, recurrenceCount: 1, recalibrationCapacity: 5, collectiveResonance: 0 },
          restrictedSignature as any
        )
      ).rejects.toThrow(IlotError);
    });

    it('🔴 doit lever une erreur 404 si l\'Oiseau est introuvable dans la Silice', async () => {
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(null);

      const orchestrator = new DemopraxyOrchestrator();
      await expect(
        orchestrator.processDemopraxicEvaluation(
          'inconnu',
          { systemicHatredScore: 5, recurrenceCount: 1, recalibrationCapacity: 5, collectiveResonance: 0 },
          adminSignature as any
        )
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit évaluer, consigner dans DemopraxyModel, verrouiller dans Mongo et propager dans Neo4j', async () => {
      const mockUser = {
        uid: 'user-uid-999',
        slug: 'oiseau-toxique',
        pseudo: 'Toxique',
      };

      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(mockUser as any);
      vi.mocked(OiseauModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce({ ...mockUser, sanctuaryVerrouille: true }),
      } as any);

      const orchestrator = new DemopraxyOrchestrator();
      const metrics: NuisanceMetrics = {
        systemicHatredScore: 8,
        recurrenceCount: 3,
        recalibrationCapacity: 1,
        collectiveResonance: -2,
      };

      const res = await orchestrator.processDemopraxicEvaluation(
        'oiseau-toxique',
        metrics,
        adminSignature as any,
        'SYSTEMIC_HATRED',
        ['toxique', 'banni']
      );

      expect(res.success).toBe(true);
      expect(res.isExcluded).toBe(true);
      expect(res.sanctionCategory).toBe('SYSTEMIC_HATRED');
      expect(res.tags).toContain('toxique');
      expect(res.targetUid).toBe('user-uid-999');
      expect(DemopraxyModel.create).toHaveBeenCalledTimes(1);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
      expect(OiseauModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
    });
  });
});