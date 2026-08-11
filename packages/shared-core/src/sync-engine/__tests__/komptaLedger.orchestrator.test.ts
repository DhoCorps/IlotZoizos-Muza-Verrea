// packages/shared-core/src/sync-engine/__tests__/komptaLedger.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KomptaLedgerOrchestrator } from '../komptaLedger.orchestrator';
import { KomptaLedgerService } from '@ilot/infrastructure/';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';

// 🛡️ CORRECTION DU CHEMIN DE MOCK : Correspond exactement à l'import de l'orchestrateur
vi.mock('@/infrastructure/', () => ({
  KomptaLedgerService: {
    recordEntry: vi.fn().mockResolvedValue(true)
  }
}));

// Fallback de sécurité si l'arborescence utilise un autre chemin relatif
vi.mock('@ilot/infrastructure/', () => ({
  KomptaLedgerService: {
    recordEntry: vi.fn().mockResolvedValue(true)
  }
}));

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (name, cb) => cb({}, { run: vi.fn() }))
  }
}));

vi.mock('@/infrastructure/src/database/models/nosql/ledgerEntry.model', () => ({
  LedgerEntryModel: {
    findOne: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      session: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(null)
    }),
    create: vi.fn().mockResolvedValue(true)
  }
}));

describe('KomptaLedgerOrchestrator - Moteur de Double Entrée', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🔴 doit rejeter le transfert si le montant est négatif ou nul', async () => {
    await expect(
      KomptaLedgerOrchestrator.transfer({
        fromUid: 'bird_1',
        toUid: 'bird_2',
        amount: 0,
        currency: 'DHO',
        category: 'BARTER',
        referenceUid: 'ref_1',
        description: 'Test invalide'
      })
    ).rejects.toThrow(IlotError);
  });

  it('🟢 doit exécuter un débit et un crédit atomiques via le TransactionManager', async () => {
    await KomptaLedgerOrchestrator.transfer({
      fromUid: 'bird_1',
      toUid: 'bird_2',
      amount: 100,
      currency: 'TOX',
      category: 'BARTER',
      referenceUid: 'ref_99',
      description: 'Échange de TôX contre un atome'
    });

    expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    expect(KomptaLedgerService.recordEntry).toHaveBeenCalledTimes(2);
    
    // Vérifie le débit
    expect(vi.mocked(KomptaLedgerService.recordEntry).mock.calls[0][0]).toMatchObject({
      ownerUid: 'bird_1',
      type: 'DEBIT',
      currency: 'TOX',
      amount: 100
    });

    // Vérifie le crédit
    expect(vi.mocked(KomptaLedgerService.recordEntry).mock.calls[1][0]).toMatchObject({
      ownerUid: 'bird_2',
      type: 'CREDIT',
      currency: 'TOX',
      amount: 100
    });
  });
});