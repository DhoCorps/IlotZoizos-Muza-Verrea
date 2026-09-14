// packages/shared-core/src/sync-engine/__tests__/karma.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KarmaOrchestrator } from '../karma.orchestrator';
import { OiseauModel, ReportModel } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    OiseauModel: {
      findOne: vi.fn(),
    },
    ReportModel: {
      findOneAndUpdate: vi.fn(),
    },
  };
});

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (_name, cb) => cb('mock-mongo-session', { run: vi.fn().mockResolvedValue({ records: [{ get: () => 'mock_node' }] }) })),
  },
}));

describe('KarmaOrchestrator - Tribunal de la Canopée & Bouclier Karmique', () => {
  let orchestrator: KarmaOrchestrator;
  const adminSignature = { actorUid: 'architect_root', capabilities: ['*'] };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new KarmaOrchestrator();
  });

  describe('executeJudgmentSanction (La Sentence)', () => {
    it('🔴 doit rejeter (403) si l\'acteur n\'a pas l\'Aura souveraine', async () => {
      const restrictedSignature = { actorUid: 'bird_random', capabilities: [] };
      await expect(
        orchestrator.executeJudgmentSanction('accuse_slug', 'report_1', 1, restrictedSignature as any)
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit consommer une Grâce dorée et annuler la sanction (Sursis) si le bouclier est actif', async () => {
      const mockUser = { 
        uid: 'accuse_uid', 
        praisesCount: 15,
        gracesUsed: 1,
        strikes: 0,
        karmaStatus: 'clear',
        save: vi.fn().mockResolvedValue(true)
      };

      vi.mocked(OiseauModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockUser),
        session: vi.fn().mockResolvedValue(mockUser)
      } as any);

      vi.mocked(ReportModel.findOneAndUpdate).mockReturnValue({
        session: vi.fn().mockResolvedValue(true)
      } as any);

      const res = await orchestrator.executeJudgmentSanction('accuse_slug', 'report_1', 1, adminSignature as any);

      expect(res.success).toBe(true);
      expect(res.usedGrace).toBe(true);
      expect(res.appliedLevel).toBe(0); 
      expect(mockUser.gracesUsed).toBe(2);
      expect(mockUser.strikes).toBe(0);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });

    it('🔥 doit appliquer la sanction et monter les strikes si le bouclier est épuisé (3 Grâces utilisées)', async () => {
      const mockUser = { 
        uid: 'accuse_uid', 
        praisesCount: 100,
        gracesUsed: 3,
        strikes: 1,
        karmaStatus: 'clear',
        save: vi.fn().mockResolvedValue(true)
      };

      vi.mocked(OiseauModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockUser),
        session: vi.fn().mockResolvedValue(mockUser)
      } as any);

      vi.mocked(ReportModel.findOneAndUpdate).mockReturnValue({
        session: vi.fn().mockResolvedValue(true)
      } as any);

      const res = await orchestrator.executeJudgmentSanction('accuse_slug', 'report_2', 2, adminSignature as any);

      expect(res.usedGrace).toBe(false);
      expect(res.appliedLevel).toBe(2);
      expect(mockUser.strikes).toBe(2);
      expect(res.newKarmaStatus).toBe('quarantined');
    });
  });
});