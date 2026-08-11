// packages/shared-core/src/sync-engine/__tests__/canopyEvolution.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CanopyEvolutionOrchestrator } from '../canopyEvolution.orchestrator';
import { KomptaLedgerOrchestrator } from '../komptaLedger.orchestrator';
import { IlotError } from '../../errors/ilot.errors';

// 🛡️ CORRECTION DU CHEMIN RELATIFS : On remonte d'un cran car on est dans __tests__/
vi.mock('../komptaLedger.orchestrator', () => ({
  KomptaLedgerOrchestrator: {
    transfer: vi.fn().mockResolvedValue(true)
  }
}));

// Sécurité supplémentaire : mock direct du TransactionManager si besoin
vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (name, cb) => cb({}, { run: vi.fn() }))
  }
}));

describe('CanopyEvolutionOrchestrator - Trophées par Application', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🔴 doit rejeter l\'attribution si le module d\'application ne correspond pas au trophée', async () => {
    await expect(
      CanopyEvolutionOrchestrator.awardAppTrophy({
        winnerUid: 'bird_producer',
        trophyId: 'samplotek_best_seller',
        appModule: 'letrin', // Mauvais module intentionnel
        cycleReference: '2026-08'
      })
    ).rejects.toThrow(IlotError);
  });

  it('🟢 doit attribuer un trophée spécifique à Samplotek (ex: Le Sample d\'Or) et verser la dotation en DhÔ', async () => {
    await CanopyEvolutionOrchestrator.awardAppTrophy({
      winnerUid: 'bird_producer',
      trophyId: 'samplotek_best_seller',
      appModule: 'samplotek',
      cycleReference: '2026-08'
    });

    expect(KomptaLedgerOrchestrator.transfer).toHaveBeenCalledTimes(1);
    expect(KomptaLedgerOrchestrator.transfer).toHaveBeenCalledWith(
      expect.objectContaining({
        fromUid: 'system_canopy_treasury',
        toUid: 'bird_producer',
        amount: 200,
        currency: 'DHO'
      })
    );
  });
});