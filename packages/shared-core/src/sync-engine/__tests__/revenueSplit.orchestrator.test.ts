import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RevenueSplitOrchestrator } from '../revenueSplit.orchestrator';
import { KomptaLedgerService, SovereignCurrency } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';
import type { ClientSession } from 'mongoose';
import type { Transaction } from 'neo4j-driver';

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    KomptaLedgerService: {
      recordEntry: vi.fn().mockResolvedValue(true)
    }
  };
});

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (_name: string, cb: (session: ClientSession, tx: Transaction) => Promise<unknown>) => 
      cb({} as ClientSession, { run: vi.fn() } as unknown as Transaction)
    )
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
        currency: 'DHO' as SovereignCurrency,
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
      { beneficiaryUid: 'system_canopy_treasury', percentage: 30 }
    ];

    await expect(
      RevenueSplitOrchestrator.distributeSaleRevenue({
        sourceBuyerUid: 'buyer_bird',
        totalAmount: 1000,
        currency: 'DHO' as SovereignCurrency,
        referenceUid: 'sale_invalid',
        description: 'Somme incorrecte',
        shares: invalidShares,
        mode: 'EXACT'
      })
    ).rejects.toThrow(IlotError);
  });

  it('🟢 doit exécuter la répartition exacte avec arrondi inférieur et injection du surplus dans le Trésor', async () => {
    const founderShares = [
      { beneficiaryUid: 'beneficiary_creator', percentage: 40 },
      { beneficiaryUid: 'system_canopy_treasury', percentage: 30 },
      { beneficiaryUid: 'beneficiary_fatijah', percentage: 20 },
      { beneficiaryUid: 'beneficiary_ai_gemini', percentage: 10 }
    ];

    await RevenueSplitOrchestrator.distributeSaleRevenue({
      sourceBuyerUid: 'buyer_bird',
      totalAmount: 1003,
      currency: 'TOX' as SovereignCurrency,
      referenceUid: 'sale_founders_surplus',
      description: 'Vente avec surplus d\'arrondi',
      shares: founderShares,
      mode: 'EXACT'
    });

    expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    expect(KomptaLedgerService.recordEntry).toHaveBeenCalled();

    const treasuryCall = vi.mocked(KomptaLedgerService.recordEntry).mock.calls.find(call => {
      const entry = call[0] as unknown as { ownerUid?: string };
      return entry.ownerUid === 'system_canopy_treasury';
    });

    expect(treasuryCall).toBeDefined();
    const resolvedEntry = treasuryCall?.[0] as unknown as { amount?: number };
    expect(resolvedEntry?.amount).toBe(302);
  });
});