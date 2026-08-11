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

vi.mock('../komptaStats.orchestrator', () => ({
  KomptaStatsEngine: { calculateMonthlyStats: vi.fn() },
}));

vi.mock('../../../../infrastructure/src/database/models/nosql/reward.model', () => ({
  RewardEntryModel: { insertMany: vi.fn().mockResolvedValue([]) },
}));

vi.mock('../../../../infrastructure/src/database/models/nosql/user.model', () => ({
  OiseauModel: { findOne: vi.fn() },
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
      const mockNeo4jTx = { run: vi.fn().mockResolvedValue({ records: [] }) };
      return await callback(mockMongoSession, mockNeo4jTx);
    }),
  },
}));

describe('MonthlyStatsOrchestrator - Le Rituel de la Moisson Mensuelle', () => {
  let orchestrator: MonthlyStatsOrchestrator;
  const targetYearMonth = '2026-08';
  
  const adminSignature = { actorUid: 'architect_root', capabilities: [CAPABILITIES.SYSTEM.ALL] };
  const hackerSignature = { actorUid: 'bird_hacker', capabilities: [] };

  beforeEach(() => {
    orchestrator = new MonthlyStatsOrchestrator();
    vi.clearAllMocks();
  });

  it('🔴 doit rejeter (403) si l\'acteur n\'a pas l\'Aura souveraine', async () => {
    await expect(orchestrator.executeMonthlyHarvest(targetYearMonth, hackerSignature as any))
      .rejects.toThrow(IlotError);
  });

  it('🟢 doit exécuter le rituel, forger les titres évocateurs et envoyer la chronique', async () => {
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

    vi.mocked(KomptaStatsEngine.calculateMonthlyStats).mockResolvedValueOnce(mockStats as any);
    
    vi.mocked(OiseauModel.findOne).mockReturnValue({
      session: vi.fn().mockReturnValue({
        lean: vi.fn()
          .mockResolvedValueOnce({ uid: 'seller_1' })
          .mockResolvedValueOnce({ uid: 'buyer_1' })
          .mockResolvedValueOnce({ uid: 'echo_1' })
          .mockResolvedValueOnce({ uid: 'react_1' })
      })
    } as any);

    const result = await orchestrator.executeMonthlyHarvest(targetYearMonth, adminSignature as any);

    expect(result.success).toBe(true);
    expect(result.distributedRewardsCount).toBe(4); // 4 prix décernés

    expect(RewardEntryModel.insertMany).toHaveBeenCalledTimes(1);
    
    // Vérification de l'envoi de la Chronique évocatrice avec les bons chiffres
    expect(MessageService.sendSystemNewsletter).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: `🌙 Chronique de la Canopée - Cycle de 2026-08`,
        content: expect.stringContaining('150.00 éclats fiduciaires'),
      })
    );

    // Vérification des chuchotements privés
    expect(MessageService.sendMessage).toHaveBeenCalledTimes(4);
  });
});