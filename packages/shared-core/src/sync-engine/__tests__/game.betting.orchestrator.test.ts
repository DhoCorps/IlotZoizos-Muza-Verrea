import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BettingOrchestrator } from '../game.betting.orchestrator';
import { TaskModel, WalletModel, BankReserve } from '@ilot/infrastructure';
import { KomptaLedgerOrchestrator } from '../komptaLedger.orchestrator';
import { IlotError } from '../../errors/ilot.errors';
import type { IAssetValue, GameMode } from '@ilot/types';

// 🛡️ 1. Mock de l'infrastructure avec des chaînes Mongoose entièrement mockées
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    TaskModel: { findOneAndUpdate: vi.fn(), findOneAndDelete: vi.fn() },
    WalletModel: { findOne: vi.fn(), findOneAndUpdate: vi.fn() },
    BankReserve: { 
      findOne: vi.fn().mockReturnValue({
        session: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ wealthIndex: 1.0 })
        })
      })
    }
  };
});

// 🛡️ 2. Mock de l'orchestrateur de ledger avec des espions claires
vi.mock('../komptaLedger.orchestrator', () => ({
  KomptaLedgerOrchestrator: { transfer: vi.fn().mockResolvedValue(true) }
}));

// 🛡️ 3. Mock unifié du TransactionManager (isole totalement de la base de données réelle)
vi.mock('../transactionManager', () => ({
  TransactionManager: { 
    execute: vi.fn(async (_name, cb) => {
      const fakeMongoSession = {};
      const fakeNeo4jTx = {
        run: vi.fn().mockResolvedValue({
          records: [{ get: () => ({ toNumber: () => 1 }) }] // Simule la 1ère victoire
        })
      };
      return await cb(fakeMongoSession, fakeNeo4jTx);
    }) 
  }
}));

describe('BettingOrchestrator - Moteur Économique & Pari', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 🟢 SUTURE GLOBALE : On garantit un portefeuille et une réserve bancaire valides par défaut
    vi.mocked(WalletModel.findOne).mockReturnValue({
      session: vi.fn().mockResolvedValue({ userId: 'bird', balance: 100, save: vi.fn() })
    } as unknown as ReturnType<typeof WalletModel.findOne>);

    vi.mocked(BankReserve.findOne).mockReturnValue({
      session: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ wealthIndex: 1.0 })
      })
    } as unknown as ReturnType<typeof BankReserve.findOne>);
  });

  describe('Méthode Historique : placeBet', () => {
    it('🔴 doit bloquer si l\'utilisateur tente de miser une tâche qu\'il ne possède pas', async () => {
      vi.mocked(TaskModel.findOneAndUpdate).mockReturnValue({
        session: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValueOnce(null) })
      } as unknown as ReturnType<typeof TaskModel.findOneAndUpdate>);

      const bets: IAssetValue[] = [{ type: 'TASK', amount: 1, entityId: 'stolen_task' }];
      const targets: IAssetValue[] = [{ type: 'TOX', amount: 10 }];

      await expect(
        BettingOrchestrator.placeBet('hacker_bird', 'game_1', bets, targets)
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit alimenter la Trésorerie en cas de défaite sur une monnaie souveraine (amountCents)', async () => {
      const cryptoMock = await import('crypto');
      vi.spyOn(cryptoMock.default, 'randomInt').mockImplementationOnce(() => 1000);

      const bets: IAssetValue[] = [{ type: 'TOX', amount: 20 }];
      const targets: IAssetValue[] = [{ type: 'TOX', amount: 50 }];

      const result = await BettingOrchestrator.placeBet('loser_bird', 'game_1', bets, targets);
      
      expect(result.isWinner).toBe(false);
      expect(KomptaLedgerOrchestrator.transfer).toHaveBeenCalledWith(
        expect.objectContaining({
          fromUid: 'loser_bird',
          toUid: 'system_canopy_treasury',
          amountCents: 20 // 🚀 Vérification de l'utilisation de amountCents
        })
      );
    });
  });

  describe('Nouvelle Méthode : resolveGameAndCalculateCredit', () => {
    it('🔴 Défaite : le gain doit être nul, sans déclencher de transfert', async () => {
      const result = await BettingOrchestrator.resolveGameAndCalculateCredit(
        'loser_bird', 'plajia_lvl_1', 'MULTIPLAYER', 'Artisan', 'plumes', 10, false
      );
      
      expect(result.creditEarned).toBe(0);
      expect(KomptaLedgerOrchestrator.transfer).not.toHaveBeenCalled();
    });

    it('🟢 Mode Solo : ne doit générer aucun bonus multiplicateur de richesse', async () => {
      const result = await BettingOrchestrator.resolveGameAndCalculateCredit(
        'solo_bird', 'plajia_lvl_1', 'SOLO' as GameMode, 'Maestro', 'plumes', 10, true
      );
      
      expect(result.creditEarned).toBe(10);
    });

    it('🟢 Mode Multijoueur : doit appliquer l\'équation de bénéfice', async () => {
      const result = await BettingOrchestrator.resolveGameAndCalculateCredit(
        'winner_bird', 'plajia_lvl_1', 'MULTIPLAYER' as GameMode, 'Maestro', 'plumes', 10, true
      );
      
      expect(result.creditEarned).toBe(30);
    });
  });
});