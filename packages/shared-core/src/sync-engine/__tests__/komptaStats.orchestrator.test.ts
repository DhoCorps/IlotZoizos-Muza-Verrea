import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KomptaStatsEngine } from '../komptaStats.orchestrator';
import { LedgerEntryModel, CommentModel, ReactionModel } from '@ilot/infrastructure';

// 🛡️ Mock unifié et sécurisé de l'infrastructure sous l'alias centralisé
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    LedgerEntryModel: { aggregate: vi.fn() },
    CommentModel: { aggregate: vi.fn() },
    ReactionModel: { aggregate: vi.fn() },
  };
});

describe('KomptaStatsEngine - Moteur Statistique Multi-Énergies & ERP', () => {
  const targetYearMonth = '2026-08';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit calculer et convertir correctement les volumes avec les taux de change (Universal Energy)', async () => {
    // 1. Raw Sellers: Un oiseau vend en EUR, l'autre en KAOS_ORGANIQUE (Taux 10x)
    vi.mocked(LedgerEntryModel.aggregate).mockResolvedValueOnce([
      { _id: { ownerUid: 'bird_fiat', currency: 'EUR' }, totalVolume: 1000 },          // 1000 * 1.0 = 1000
      { _id: { ownerUid: 'bird_kaos', currency: 'KAOS_ORGANIQUE' }, totalVolume: 200 }  // 200 * 10.0 = 2000 (Le vrai gagnant !)
    ]);

    // 2. Raw Buyers
    vi.mocked(LedgerEntryModel.aggregate).mockResolvedValueOnce([
      { _id: { ownerUid: 'bird_buyer', currency: 'TOTAMTOE' }, totalVolume: 5000 }      // 5000 * 0.1 = 500
    ]);

    // 3. Comments & 4. Reactions
    vi.mocked(CommentModel.aggregate).mockResolvedValueOnce([{ _id: 'bird_echo', commentCount: 42 }]);
    vi.mocked(ReactionModel.aggregate).mockResolvedValueOnce([{ _id: 'bird_react', reactionCount: 12 }]);

    // 5. Macro Totals
    vi.mocked(LedgerEntryModel.aggregate).mockResolvedValueOnce([
      { _id: 'EUR', totalVolume: 1000, transactionCount: 5 },
      { _id: 'KAOS_ORGANIQUE', totalVolume: 200, transactionCount: 1 }
    ]);

    const stats = await KomptaStatsEngine.calculateMonthlyStats(targetYearMonth);

    // Vérification du classement converti
    expect(stats.topSellers).toHaveLength(2);
    expect(stats.topSellers[0].uid).toBe('bird_kaos'); // bird_kaos passe devant grâce au taux de change
    expect(stats.topSellers[0].universalEnergyVolume).toBe(2000);
    expect(stats.topSellers[0].balances['KAOS_ORGANIQUE']).toBe(200);

    expect(stats.topSellers[1].uid).toBe('bird_fiat');
    expect(stats.topSellers[1].universalEnergyVolume).toBe(1000);

    expect(stats.topBuyers[0].universalEnergyVolume).toBe(500);

    // Vérification des Macro Totaux isolés par énergie
    expect(stats.macroTotals['EUR'].totalVolume).toBe(1000);
    expect(stats.macroTotals['KAOS_ORGANIQUE'].transactionCount).toBe(1);
  });

  it('🟢 doit retourner des structures saines (vide) si le mois est totalement inactif (Zéro transaction)', async () => {
    vi.mocked(LedgerEntryModel.aggregate).mockResolvedValue([]);
    vi.mocked(CommentModel.aggregate).mockResolvedValue([]);
    vi.mocked(ReactionModel.aggregate).mockResolvedValue([]);

    const stats = await KomptaStatsEngine.calculateMonthlyStats(targetYearMonth);

    expect(stats.yearMonth).toBe(targetYearMonth);
    expect(stats.topSellers).toEqual([]);
    expect(stats.topBuyers).toEqual([]);
    expect(stats.mostCommented).toEqual([]);
    expect(stats.mostReactive).toEqual([]);
    expect(stats.macroTotals).toEqual({});
  });

  it('🟢 doit calculer le CA HT total, la TVA collectée et la marge nette pour un marchand via aggregateFinancialStats', async () => {
    vi.mocked(LedgerEntryModel.aggregate).mockResolvedValueOnce([{
      _id: null,
      caTTC: 2400,
      caHT: 2000,
      tvaCollected: 400,
      platformFees: 100,
      transactionCount: 2
    }]);

    const stats = await KomptaStatsEngine.aggregateFinancialStats('marchand_1', targetYearMonth);

    expect(LedgerEntryModel.aggregate).toHaveBeenCalledTimes(1);
    
    // 🛡️ CORRECTION : Cast en 'any' pour contourner le typage PipelineStage strict de Mongoose sur $match
    const aggregateCall = vi.mocked(LedgerEntryModel.aggregate).mock.calls[0][0];
    const matchStage = aggregateCall[0] as any;
    
    expect(matchStage.$match).toMatchObject({
      ownerUid: 'marchand_1',
      type: 'CREDIT',
      category: 'STORE_SALE'
    });

    // Vérification des données analytiques extraites
    expect(stats.yearMonth).toBe(targetYearMonth);
    expect(stats.caTTC).toBe(2400);
    expect(stats.caHT).toBe(2000);
    expect(stats.tvaCollected).toBe(400);
    expect(stats.platformFees).toBe(100);
    // Marge nette = caHT - platformFees = 2000 - 100 = 1900
    expect(stats.netMargin).toBe(1900);
    expect(stats.transactionCount).toBe(2);
  });

  it('🟢 doit gérer gracieusement les statistiques financières si le marchand n\'a fait aucune vente', async () => {
    vi.mocked(LedgerEntryModel.aggregate).mockResolvedValueOnce([]); // Aucun résultat

    const stats = await KomptaStatsEngine.aggregateFinancialStats('marchand_2', targetYearMonth);

    expect(stats.caTTC).toBe(0);
    expect(stats.caHT).toBe(0);
    expect(stats.tvaCollected).toBe(0);
    expect(stats.platformFees).toBe(0);
    expect(stats.netMargin).toBe(0);
    expect(stats.transactionCount).toBe(0);
  });
});