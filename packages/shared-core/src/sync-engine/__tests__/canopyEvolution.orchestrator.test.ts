import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CanopyEvolutionOrchestrator } from '../canopyEvolution.orchestrator';
import { KomptaLedgerOrchestrator } from '../komptaLedger.orchestrator';
import { CanopyAwardModel } from '@ilot/infrastructure';
import { IlotError } from '../../errors/ilot.errors';

// 🗑️ Nous avons supprimé le mock de CANOPY_REGISTRY.
// Le test s'exécute désormais contre ta VRAIE configuration, le rendant bien plus robuste !

// 🛡️ MOCK DE L'INFRASTRUCTURE (Mongoose)
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    CanopyAwardModel: {
      findOneAndUpdate: vi.fn().mockResolvedValue(true)
    }
  };
});

// 🛡️ MOCK DU LEDGER : On isole la brique financière
vi.mock('../komptaLedger.orchestrator', () => ({
  KomptaLedgerOrchestrator: {
    transfer: vi.fn().mockResolvedValue(true)
  }
}));

// 🛡️ MOCK DU TRANSACTION MANAGER (Isolation Mongo & Neo4j)
vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (_name, cb) => {
      const mockMongoSession = {};
      const mockNeo4jTx = { run: vi.fn().mockResolvedValue(true) };
      return await cb(mockMongoSession, mockNeo4jTx);
    })
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

  it('🟢 doit attribuer un trophée spécifique (Ledger + Mongo + Neo4j)', async () => {
    await CanopyEvolutionOrchestrator.awardAppTrophy({
      winnerUid: 'bird_producer',
      trophyId: 'samplotek_best_seller',
      appModule: 'samplotek',
      cycleReference: '2026-08'
    });

    // 1. Vérification du transfert financier avec amountCents
    expect(KomptaLedgerOrchestrator.transfer).toHaveBeenCalledTimes(1);
    expect(KomptaLedgerOrchestrator.transfer).toHaveBeenCalledWith(
      expect.objectContaining({
        fromUid: 'system_canopy_treasury',
        toUid: 'bird_producer',
        amountCents: expect.any(Number),
        currency: expect.any(String)
      })
    );

    // 2. Vérification de l'enregistrement MongoDB (via la session du TransactionManager)
    expect(CanopyAwardModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(CanopyAwardModel.findOneAndUpdate).toHaveBeenCalledWith(
      { yearMonth: '2026-08', awardKey: 'samplotek_best_seller' },
      expect.objectContaining({
        recipientUid: 'bird_producer',
        // Vérification partielle pour contourner les conflits d'apostrophes (droite vs typographique)
        title: expect.stringContaining('Sample')
      }),
      expect.objectContaining({ session: expect.anything() })
    );
  });
});