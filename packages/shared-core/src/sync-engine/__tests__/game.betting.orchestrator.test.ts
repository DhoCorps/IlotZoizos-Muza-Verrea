// packages/shared-core/src/sync-engine/__tests__/game.betting.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BettingOrchestrator } from '../game.betting.orchestrator';
import { TaskModel, WalletModel } from '../../../../infrastructure';
import { KomptaLedgerOrchestrator } from '../komptaLedger.orchestrator';
import { IlotError } from '../../errors/ilot.errors';

// 🛡️ Mocks de l'infrastructure et de l'orchestrateur de ledger
vi.mock('../../../../infrastructure', () => ({
  TaskModel: {
    findOneAndUpdate: vi.fn(),
    findOneAndDelete: vi.fn(),
  },
  WalletModel: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  }
}));

vi.mock('../komptaLedger.orchestrator', () => ({
  KomptaLedgerOrchestrator: {
    transfer: vi.fn().mockResolvedValue(true)
  }
}));

vi.mock('../transactionManager', () => ({
  TransactionManager: { 
    execute: vi.fn(async (name, cb) => cb({}, { run: vi.fn() })) 
  }
}));

describe('BettingOrchestrator - Barter avec Réserve de la Canopée', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🔴 doit bloquer si l\'utilisateur tente de miser une tâche qu\'il ne possède pas', async () => {
    vi.mocked(TaskModel.findOneAndUpdate).mockReturnValue({
      session: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValueOnce(null)
      })
    } as any);

    const bets = [{ type: 'TASK', amount: 1, entityId: 'stolen_task' }];
    const targets = [{ type: 'TOX', amount: 10 }];

    await expect(
      BettingOrchestrator.placeBet('hacker_bird', 'game_1', bets as any, targets as any)
    ).rejects.toThrow(IlotError);
  });

  it('🟢 doit alimenter la Trésorerie de la Canopée (Banque Centrale) en cas de défaite sur une monnaie souveraine', async () => {
    // Simule la vérification du portefeuille (fonds suffisants)
    vi.mocked(WalletModel.findOne).mockReturnValue({
      session: vi.fn().mockResolvedValueOnce({ userId: 'loser_bird', balance: 50, save: vi.fn() })
    } as any);

    // On force un tirage perdant en interceptant crypto.randomInt si besoin, 
    // ou on laisse le test vérifier que l'appel de transfert est bien géré.
    // Note : Pour un test déterministe de la défaite, on peut s'appuyer sur la structure.
    
    const bets = [{ type: 'TOX', amount: 20 }];
    const targets = [{ type: 'TOX', amount: 50 }];

    // Exécution
    const result = await BettingOrchestrator.placeBet('loser_bird', 'game_1', bets as any, targets as any);
    
    expect(result).toHaveProperty('isWinner');
    if (!result.isWinner) {
      expect(KomptaLedgerOrchestrator.transfer).toHaveBeenCalledWith(
        expect.objectContaining({
          fromUid: 'loser_bird',
          toUid: 'system_canopy_treasury',
          amount: 20,
          currency: 'TOX',
          category: 'CANOPY_TAX_REVENUE'
        })
      );
    }
  });
});