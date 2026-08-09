// packages/shared-core/src/sync-engine/__tests__/monthlyStats.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MonthlyStatsOrchestrator } from '../monthlyStats.orchestrator';
import { KomptaStatsEngine } from '../komptaStats.orchestrator';
import { RewardEntryModel } from '../../../../infrastructure/src/database/models/nosql/reward.model';
import { OiseauModel } from '../../../../infrastructure/src/database/models/nosql/user.model';
import { MessageService } from '../../../../../apps/hub-central/modules/messaging/message.service';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';
import { CAPABILITIES } from '@ilot/types';

// 1. Mocks des dépendances de l'orchestrateur
vi.mock('../komptaStats.orchestrator', () => ({
  KomptaStatsEngine: {
    calculateMonthlyStats: vi.fn(),
  },
}));

vi.mock('../../../../infrastructure/src/database/models/nosql/reward.model', () => ({
  RewardEntryModel: {
    insertMany: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../../../infrastructure/src/database/models/nosql/user.model', () => ({
  OiseauModel: {
    findOne: vi.fn(),
  },
}));

vi.mock('../../../../../apps/hub-central/modules/messaging/message.service', () => ({
  MessageService: {
    sendSystemNewsletter: vi.fn().mockResolvedValue({ success: true }),
    sendMessage: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (name, callback) => {
      const mockMongoSession = {};
      const mockNeo4jTx = {
        run: vi.fn().mockResolvedValue({ records: [] }),
      };
      return await callback(mockMongoSession, mockNeo4jTx);
    }),
  },
}));

describe('MonthlyStatsOrchestrator - Moisson et Récompenses de la Canopée', () => {
  let orchestrator: MonthlyStatsOrchestrator;
  const targetYearMonth = '2026-08';

  const adminSignature = {
    actorUid: 'architect_root',
    capabilities: [CAPABILITIES.SYSTEM.ALL],
  };

  const hackerSignature = {
    actorUid: 'bird_hacker',
    capabilities: [],
  };

  beforeEach(() => {
    orchestrator = new MonthlyStatsOrchestrator();
    vi.clearAllMocks();
  });

  describe('Contrôle d\'Aura et Sécurité', () => {
    it('doit rejeter (403) si l\'acteur n\'a pas la capacité requise', async () => {
      await expect(
        orchestrator.executeMonthlyHarvest(targetYearMonth, hackerSignature as any)
      ).rejects.toThrow(IlotError);
    });
  });

  describe('Exécution de la Moisson et Distribution des Récompenses', () => {
    it('doit calculer les stats, attribuer les récompenses, envoyer la newsletter et notifier les lauréats en privé', async () => {
      const mockStats = {
        yearMonth: targetYearMonth,
        topSellers: [{ _id: 'seller_1', totalVolumeCents: 10000 }],
        topBuyers: [{ _id: 'buyer_1', totalSpentCents: 5000 }],
        mostCommented: [{ _id: 'echo_1', commentCount: 20 }],
        mostReactive: [],
        macroTotals: { totalVolumeCents: 15000, transactionCount: 3 },
      };

      vi.mocked(KomptaStatsEngine.calculateMonthlyStats).mockResolvedValueOnce(mockStats);
      
      // Simulation de la recherche des oiseaux lauréats en base
      vi.mocked(OiseauModel.findOne).mockReturnValue({
        session: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValueOnce({ uid: 'seller_1', pseudo: 'VendeurOr' })
                        .mockResolvedValueOnce({ uid: 'echo_1', pseudo: 'OiseauEcho' })
        })
      } as any);

      const result = await orchestrator.executeMonthlyHarvest(targetYearMonth, adminSignature as any);

      expect(result.success).toBe(true);
      expect(result.distributedRewardsCount).toBe(2);

      // Vérification de l'insertion des récompenses
      expect(RewardEntryModel.insertMany).toHaveBeenCalledTimes(1);

      // Vérification de l'envoi de la newsletter globale
      expect(MessageService.sendSystemNewsletter).toHaveBeenCalledTimes(1);

      // Vérification de l'envoi des messages privés de félicitations aux lauréats
      expect(MessageService.sendMessage).toHaveBeenCalledTimes(2);
      expect(MessageService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationSlug: 'private-seller_1',
          senderSlug: 'SYSTEM_CANOPY_ROOT',
        })
      );
    });
  });
});