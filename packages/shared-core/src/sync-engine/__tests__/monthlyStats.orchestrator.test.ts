import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MonthlyStatsOrchestrator, CanopyHarvestNotificationListener } from '../monthlyStats.orchestrator';
import { KomptaStatsEngine } from '../komptaStats.orchestrator';
import { RewardEntryModel, findEntityBySlugOrUid, PageViewModel } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';
import { CAPABILITIES } from '@ilot/types';

vi.mock('../komptaStats.orchestrator', () => ({
  KomptaStatsEngine: { calculateMonthlyStats: vi.fn() },
}));

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    RewardEntryModel: { insertMany: vi.fn().mockResolvedValue([]) },
    OiseauModel: {},
    PageViewModel: { aggregate: vi.fn().mockResolvedValue([]) }, 
    findEntityBySlugOrUid: vi.fn(),
  };
});

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (_name, callback) => {
      const mockMongoSession = {};
      const mockNeo4jTx = { run: vi.fn().mockResolvedValue({ records: [] }) };
      return await callback(mockMongoSession, mockNeo4jTx);
    }),
  },
}));

describe('MonthlyStatsOrchestrator & Listener - Architecture Pub/Sub', () => {
  let orchestrator: MonthlyStatsOrchestrator;
  let mockEventPublisher: { emit: ReturnType<typeof vi.fn> };
  
  const mockMessageManager = {
    sendSystemNewsletter: vi.fn().mockResolvedValue({ success: true }),
    sendMessage: vi.fn().mockResolvedValue({ success: true }),
  };

  const targetYearMonth = '2026-08';
  const adminSignature = { actorUid: 'architect_root', capabilities: [CAPABILITIES.SYSTEM.ALL] };
  const hackerSignature = { actorUid: 'bird_hacker', capabilities: [] };

  const mockStats = {
    yearMonth: targetYearMonth,
    topSellers: [{ uid: 'seller_1', universalEnergyVolume: 2000, balances: {} }],
    topBuyers: [{ uid: 'buyer_1', universalEnergyVolume: 1000, balances: {} }],
    mostCommented: [{ _id: 'echo_1', commentCount: 20 }],
    mostReactive: [{ _id: 'react_1', reactionCount: 50 }],
    macroTotals: { 
      'EUR': { totalVolume: 15000, transactionCount: 10 },
      'KAOS_ORGANIQUE': { totalVolume: 500, transactionCount: 2 }
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockEventPublisher = { emit: vi.fn() };
    orchestrator = new MonthlyStatsOrchestrator(mockEventPublisher);
  });

  describe('MonthlyStatsOrchestrator (Le Publieur)', () => {
    it('⚡ doit rejeter (403) si l\'acteur n\'a pas l\'Aura souveraine', async () => {
      await expect(orchestrator.executeMonthlyHarvest(targetYearMonth, hackerSignature as any))
        .rejects.toThrow(IlotError);
    });

    it('🌳 doit exécuter le rituel en base et émettre l\'évènement de fin (asynchrone) sans bloquer', async () => {
      vi.mocked(KomptaStatsEngine.calculateMonthlyStats).mockResolvedValueOnce(mockStats as any);

      const result = await orchestrator.executeMonthlyHarvest(targetYearMonth, adminSignature as any);

      expect(result.success).toBe(true);
      expect(result.distributedRewardsCount).toBe(4);
      expect(RewardEntryModel.insertMany).toHaveBeenCalledTimes(1);
      
      // 🚀 Vérification du découplage : L'évènement Pub/Sub doit être émis avec le bon payload
      expect(mockEventPublisher.emit).toHaveBeenCalledWith(
        'CANOPY_HARVEST_COMPLETED', 
        expect.objectContaining({
          yearMonth: targetYearMonth,
          stats: mockStats,
          awardedRewards: expect.any(Array)
        })
      );
    });

    it('📊 doit calculer le trafic quotidien et mensuel d\'une boutique pour l\'ERP', async () => {
      vi.mocked(PageViewModel.aggregate)
        .mockResolvedValueOnce([
          { _id: '2026-08-01', visitors: ['user_1', 'user_2'], pageViews: 5 },
          { _id: '2026-08-02', visitors: ['user_1'], pageViews: 2 }
        ])
        .mockResolvedValueOnce([
          { _id: '2026-07', visitors: ['user_1', 'user_2', 'user_3'], pageViews: 15 },
          { _id: '2026-08', visitors: ['user_1', 'user_2'], pageViews: 7 }
        ]);

      const result = await orchestrator.getStoreTraffic('store_abc123', '2026-08');

      expect(result.dailyTraffic).toHaveLength(2);
      expect(result.historicalMonthlyTraffic).toHaveLength(2);
    });
  });

  describe('CanopyHarvestNotificationListener (L\'Écouteur)', () => {
    it('📨 doit consommer l\'évènement et propager la newsletter ainsi que les messages privés', async () => {
      vi.mocked(findEntityBySlugOrUid).mockImplementation(async (_model, identifier: any) => {
        return { uid: identifier } as any;
      });

      const listener = new CanopyHarvestNotificationListener(mockMessageManager);
      
      const mockAwardedRewards = [
        { ownerUid: 'seller_1', metadata: { aura: 'Lumière Créatrice' } },
        { ownerUid: 'buyer_1', metadata: { aura: 'Vent Porteur' } },
      ];

      // Exécution de l'écouteur en arrière-plan
      await listener.handleHarvestCompleted({
        yearMonth: targetYearMonth,
        stats: mockStats,
        awardedRewards: mockAwardedRewards as any[]
      });

      // Vérification de la newsletter
      expect(mockMessageManager.sendSystemNewsletter).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: `📢 Chronique de la Canopée - Cycle de ${targetYearMonth}`,
          content: expect.stringContaining('150.00 éclats fiduciaires'),
        })
      );

      // Vérification des chuchotements (2 lauréats = 2 messages envoyés)
      expect(mockMessageManager.sendMessage).toHaveBeenCalledTimes(2);
    });
  });
});