import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BettingOrchestrator } from '../game.betting.orchestrator';
import { TaskModel, WalletModel, BankReserve } from '@ilot/infrastructure';
import { KomptaLedgerOrchestrator } from '../komptaLedger.orchestrator';
import { IlotError } from '../../errors/ilot.errors';

// 🛡️ 1. Mock de l'infrastructure
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    TaskModel: { findOneAndUpdate: vi.fn(), findOneAndDelete: vi.fn() },
    WalletModel: { findOne: vi.fn(), findOneAndUpdate: vi.fn() },
    BankReserve: { findOne: vi.fn() }
  };
});

// 🛡️ 2. Mock de l'orchestrateur de ledger
vi.mock('../komptaLedger.orchestrator', () => ({
  KomptaLedgerOrchestrator: { transfer: vi.fn().mockResolvedValue(true) }
}));

// 🛡️ 3. Mock unifié du TransactionManager
vi.mock('../transactionManager', () => ({
  TransactionManager: { 
    execute: vi.fn(async (name, cb) => {
      const fakeMongoSession = {};
      const fakeNeo4jTx = {
        run: vi.fn().mockResolvedValue({
          records: [{ get: () => ({ toNumber: () => 1 }) }] // Simule la 1ère victoire
        })
      };
      return cb(fakeMongoSession, fakeNeo4jTx);
    }) 
  }
}));

describe('BettingOrchestrator - Moteur Économique & Pari', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 🟢 SUTURE GLOBALE : On rend .session() toujours disponible pour éviter les crashs
    vi.mocked(BankReserve.findOne).mockReturnValue({
      session: vi.fn().mockResolvedValue({ wealthIndex: 1.0 })
    } as any);

    vi.mocked(WalletModel.findOne).mockReturnValue({
      session: vi.fn().mockResolvedValue({ userId: 'bird', balance: 100, save: vi.fn() })
    } as any);
  });

  describe('Méthode Historique : placeBet', () => {
    it('🔴 doit bloquer si l\'utilisateur tente de miser une tâche qu\'il ne possède pas', async () => {
      vi.mocked(TaskModel.findOneAndUpdate).mockReturnValue({
        session: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValueOnce(null) })
      } as any);

      const bets = [{ type: 'TASK', amount: 1, entityId: 'stolen_task' }];
      const targets = [{ type: 'TOX', amount: 10 }];

      await expect(
        BettingOrchestrator.placeBet('hacker_bird', 'game_1', bets as any, targets as any)
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit alimenter la Trésorerie en cas de défaite sur une monnaie souveraine', async () => {
      const bets = [{ type: 'TOX', amount: 20 }];
      const targets = [{ type: 'TOX', amount: 50 }];

      const result = await BettingOrchestrator.placeBet('loser_bird', 'game_1', bets as any, targets as any);
      
      expect(result).toHaveProperty('isWinner');
      if (!result.isWinner) {
        expect(KomptaLedgerOrchestrator.transfer).toHaveBeenCalledWith(
          expect.objectContaining({
            fromUid: 'loser_bird',
            toUid: 'system_canopy_treasury',
            amount: 20
          })
        );
      }
    });
  });

  describe('Nouvelle Méthode : resolveGameAndCalculateCredit', () => {
    it('🔴 Défaite : le gain doit être nul, sans déclencher de transfert', async () => {
      const result = await BettingOrchestrator.resolveGameAndCalculateCredit(
        'loser_bird', 'plajia_lvl_1', 'multiplayer', 'Artisan', 'plumes', 10, false
      );
      
      expect(result.creditEarned).toBe(0);
      // Pas de vérification de transfer ici : c'est le Séquestre (EconomyService) qui a déjà l'argent.
      expect(KomptaLedgerOrchestrator.transfer).not.toHaveBeenCalled();
    });

    it('🟢 Mode Solo : ne doit générer aucun bonus multiplicateur de richesse', async () => {
      const result = await BettingOrchestrator.resolveGameAndCalculateCredit(
        'solo_bird', 'plajia_lvl_1', 'solo', 'Maestro', 'plumes', 10, true
      );
      
      expect(result.creditEarned).toBe(10); // L'Oiseau récupère simplement sa mise brute
    });

    it('🟢 Mode Multijoueur : doit appliquer l\'équation de bénéfice', async () => {
      // Pour une mise de 10 en Maestro (x2), le calcul donne : 10 + (10 * 2) = 30
      const result = await BettingOrchestrator.resolveGameAndCalculateCredit(
        'winner_bird', 'plajia_lvl_1', 'multiplayer', 'Maestro', 'plumes', 10, true
      );
      
      expect(result.creditEarned).toBe(30);
    });
  });
});