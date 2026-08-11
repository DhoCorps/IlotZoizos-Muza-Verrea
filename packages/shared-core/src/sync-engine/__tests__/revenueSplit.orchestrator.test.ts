// packages/shared-core/src/sync-engine/__tests__/revenueSplit.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RevenueSplitOrchestrator } from '../revenueSplit.orchestrator';
import { KomptaLedgerService } from '../../../../infrastructure/src/database/services/komptaLedger.services';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';

// 🛡️ Mocks de l'infrastructure et des transactions
vi.mock('../../../../infrastructure/src/database/services/komptaLedger.services', () => ({
  KomptaLedgerService: {
    recordEntry: vi.fn().mockResolvedValue(true)
  }
}));

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (name, cb) => cb({}, { run: vi.fn() }))
  }
}));

describe('RevenueSplitOrchestrator - Moteur de Partage des Flux', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🔴 doit rejeter la répartition si la liste des bénéficiaires est vide', async () => {
    await expect(
      RevenueSplitOrchestrator.distributeSaleRevenue({
        sourceBuyerUid: 'buyer_bird',
        totalAmount: 1000,
        currency: 'DHO',
        referenceUid: 'sale_empty',
        description: 'Vente vide',
        shares: [],
        mode: 'EXACT'
      })
    ).rejects.toThrow(IlotError);
  });

  it('🔴 doit rejeter la répartition si les pourcentages ne totalisent pas 100% en mode EXACT', async () => {
    const invalidShares = [
      { beneficiaryUid: 'beneficiary_creator', percentage: 60 },
      { beneficiaryUid: 'system_canopy_treasury', percentage: 30 } // Total = 90%
    ];

    await expect(
      RevenueSplitOrchestrator.distributeSaleRevenue({
        sourceBuyerUid: 'buyer_bird',
        totalAmount: 1000,
        currency: 'DHO',
        referenceUid: 'sale_invalid',
        description: 'Somme incorrecte',
        shares: invalidShares,
        mode: 'EXACT'
      })
    ).rejects.toThrow(IlotError);
  });

  it('🟢 doit exécuter la répartition exacte entre les fondateurs (Toi, l\'Îlot, FatiJah, Moi)', async () => {
    const founderShares = [
      { beneficiaryUid: 'beneficiary_creator', percentage: 40 },
      { beneficiaryUid: 'system_canopy_treasury', percentage: 30 },
      { beneficiaryUid: 'beneficiary_fatijah', percentage: 20 },
      { beneficiaryUid: 'beneficiary_ai_gemini', percentage: 10 }
    ];

    await RevenueSplitOrchestrator.distributeSaleRevenue({
      sourceBuyerUid: 'buyer_bird',
      totalAmount: 1000,
      currency: 'TOX',
      referenceUid: 'sale_founders_01',
      description: 'Vente du grand portail',
      shares: founderShares,
      mode: 'EXACT'
    });

    expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    expect(KomptaLedgerService.recordEntry).toHaveBeenCalledTimes(4);

    // Vérifie que le premier bénéficiaire (Toi) reçoit bien 40% (400 TôX)
    expect(vi.mocked(KomptaLedgerService.recordEntry).mock.calls[0][0]).toMatchObject({
      ownerUid: 'beneficiary_creator',
      amount: 400,
      currency: 'TOX',
      type: 'CREDIT'
    });

    // Vérifie que l'architecte (Moi) reçoit bien 10% (100 TôX)
    expect(vi.mocked(KomptaLedgerService.recordEntry).mock.calls[3][0]).toMatchObject({
      ownerUid: 'beneficiary_ai_gemini',
      amount: 100,
      currency: 'TOX',
      type: 'CREDIT'
    });
  });

  it('🟢 doit calculer un partage équitable automatique en mode EQUAL', async () => {
    const participants = [
      { beneficiaryUid: 'beneficiary_creator' },
      { beneficiaryUid: 'beneficiary_fatijah' }
    ]; // 2 participants -> 50% chacun

    await RevenueSplitOrchestrator.distributeSaleRevenue({
      sourceBuyerUid: 'buyer_bird',
      totalAmount: 500,
      currency: 'DHO',
      referenceUid: 'sale_equal_01',
      description: 'Partage à deux',
      shares: participants,
      mode: 'EQUAL'
    });

    expect(KomptaLedgerService.recordEntry).toHaveBeenCalledTimes(2);
    
    // Chacun doit toucher 250 DhÔ (50%)
    expect(vi.mocked(KomptaLedgerService.recordEntry).mock.calls[0][0]).toMatchObject({
      ownerUid: 'beneficiary_creator',
      amount: 250,
      currency: 'DHO'
    });
    expect(vi.mocked(KomptaLedgerService.recordEntry).mock.calls[1][0]).toMatchObject({
      ownerUid: 'beneficiary_fatijah',
      amount: 250,
      currency: 'DHO'
    });
  });
});