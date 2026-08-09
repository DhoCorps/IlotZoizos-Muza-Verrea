// packages/shared-core/src/sync-engine/__tests__/kompta.stats.engine.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KomptaStatsEngine } from '../komptaStats.orchestrator';
import { LedgerEntryModel } from '../../../../infrastructure/src/database/models/nosql/ledgerEntry.model';
import { CommentModel } from '../../../../infrastructure/src/database/models/nosql/comment.model';
import { ReactionModel } from '../../../../infrastructure/src/database/models/nosql/reaction.model';

// 1. Mock complet des modèles Mongoose pour intercepter les pipelines d'agrégation
vi.mock('../../../../infrastructure/src/database/models/nosql/ledgerEntry.model', () => ({
  LedgerEntryModel: {
    aggregate: vi.fn(),
  },
}));

vi.mock('../../../../infrastructure/src/database/models/nosql/comment.model', () => ({
  CommentModel: {
    aggregate: vi.fn(),
  },
}));

vi.mock('../../../../infrastructure/src/database/models/nosql/reaction.model', () => ({
  ReactionModel: {
    aggregate: vi.fn(),
  },
}));

describe('KomptaStatsEngine - Moteur d\'Agrégation Statistique Mensuelle', () => {
  const targetYearMonth = '2026-08';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('doit calculer et agréger correctement les statistiques mensuelles de la canopée', async () => {
    // Ordre d'appel dans le moteur :
    // 1. LedgerEntryModel (Top Sellers)
    vi.mocked(LedgerEntryModel.aggregate).mockResolvedValueOnce([
      { _id: 'bird_seller_1', totalVolumeCents: 15000 }
    ]);
    // 2. LedgerEntryModel (Top Buyers)
    vi.mocked(LedgerEntryModel.aggregate).mockResolvedValueOnce([
      { _id: 'bird_buyer_1', totalSpentCents: 5000 }
    ]);
    // 3. CommentModel (Most Commented)
    vi.mocked(CommentModel.aggregate).mockResolvedValueOnce([
      { _id: 'bird_echo_1', commentCount: 42 }
    ]);
    // 4. ReactionModel (Most Reactive)
    vi.mocked(ReactionModel.aggregate).mockResolvedValueOnce([
      { _id: 'bird_reactive_1', reactionCount: 128 }
    ]);
    // 5. LedgerEntryModel (Macro Totals)
    vi.mocked(LedgerEntryModel.aggregate).mockResolvedValueOnce([
      { _id: null, totalVolumeCents: 20000, transactionCount: 15 }
    ]);

    const stats = await KomptaStatsEngine.calculateMonthlyStats(targetYearMonth);

    expect(stats.yearMonth).toBe(targetYearMonth);
    expect(stats.topSellers[0]).toEqual({ _id: 'bird_seller_1', totalVolumeCents: 15000 });
    expect(stats.topBuyers[0]).toEqual({ _id: 'bird_buyer_1', totalSpentCents: 5000 });
    expect(stats.mostCommented[0]).toEqual({ _id: 'bird_echo_1', commentCount: 42 });
    expect(stats.mostReactive[0]).toEqual({ _id: 'bird_reactive_1', reactionCount: 128 });
    expect(stats.macroTotals).toEqual({
      totalVolumeCents: 20000,
      transactionCount: 15
    });

    expect(LedgerEntryModel.aggregate).toHaveBeenCalledTimes(3);
    expect(CommentModel.aggregate).toHaveBeenCalledTimes(1);
    expect(ReactionModel.aggregate).toHaveBeenCalledTimes(1);
  });

  it('doit gérer proprement les valeurs par défaut (zéros) si les agrégations retournent des tableaux vides', async () => {
    vi.mocked(LedgerEntryModel.aggregate).mockResolvedValue([]);
    vi.mocked(CommentModel.aggregate).mockResolvedValue([]);
    vi.mocked(ReactionModel.aggregate).mockResolvedValue([]);

    const stats = await KomptaStatsEngine.calculateMonthlyStats(targetYearMonth);

    expect(stats.yearMonth).toBe(targetYearMonth);
    expect(stats.topSellers).toEqual([]);
    expect(stats.topBuyers).toEqual([]);
    expect(stats.mostCommented).toEqual([]);
    expect(stats.mostReactive).toEqual([]);
    expect(stats.macroTotals).toEqual({
      totalVolumeCents: 0,
      transactionCount: 0
    });
  });
});