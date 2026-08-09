// packages/shared-core/src/sync-engine/kompta.stats.engine.ts
import { LedgerEntryModel } from '../../../infrastructure/src/database/models/nosql/ledgerEntry.model';
import { CommentModel } from '../../../infrastructure/src/database/models/nosql/comment.model';
import { ReactionModel } from '../../../infrastructure/src/database/models/nosql/reaction.model';

export interface MonthlyCanopyStats {
  yearMonth: string;
  topSellers: Array<{ _id: string; totalVolumeCents: number }>;
  topBuyers: Array<{ _id: string; totalSpentCents: number }>;
  mostCommented: Array<{ _id: string; commentCount: number }>;
  mostReactive: Array<{ _id: string; reactionCount: number }>;
  macroTotals: {
    totalVolumeCents: number;
    transactionCount: number;
  };
}

export class KomptaStatsEngine {
  /**
   * Calcule et agrège toutes les métriques de la canopée pour un mois donné ("YYYY-MM")
   */
  public static async calculateMonthlyStats(yearMonth: string): Promise<MonthlyCanopyStats> {
    const startDate = new Date(`${yearMonth}-01T00:00:00Z`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // 1. Top Vendeurs (Crédits de type STORE_SALE)
    const topSellers = await LedgerEntryModel.aggregate([
      { $match: { createdAt: { $gte: startDate, $lt: endDate }, type: 'CREDIT', category: 'STORE_SALE' } },
      { $group: { _id: '$ownerUid', totalVolumeCents: { $sum: '$amountCents' } } },
      { $sort: { totalVolumeCents: -1 } },
      { $limit: 5 }
    ]);

    // 2. Top Acheteurs / Mécènes (Débits de type STORE_PURCHASE ou TIP)
    const topBuyers = await LedgerEntryModel.aggregate([
      { $match: { createdAt: { $gte: startDate, $lt: endDate }, type: 'DEBIT', category: { $in: ['STORE_PURCHASE', 'TIP'] } } },
      { $group: { _id: '$ownerUid', totalSpentCents: { $sum: '$amountCents' } } },
      { $sort: { totalSpentCents: -1 } },
      { $limit: 5 }
    ]);

    // 3. L'Oiseau Écho (Plus grand nombre de commentaires reçus)
    const mostCommented = await CommentModel.aggregate([
      { $match: { createdAt: { $gte: startDate, $lt: endDate } } },
      { $group: { _id: '$targetOwnerUid', commentCount: { $sum: 1 } } },
      { $sort: { commentCount: -1 } },
      { $limit: 5 }
    ]);

    // 4. L'Oiseau Réactif (Plus grand nombre de réactions emoji envoyées/posées)
    const mostReactive = await ReactionModel.aggregate([
      { $match: { createdAt: { $gte: startDate, $lt: endDate } } },
      { $group: { _id: '$senderUid', reactionCount: { $sum: 1 } } },
      { $sort: { reactionCount: -1 } },
      { $limit: 5 }
    ]);

    // 5. Macro Totaux financiers
    const macroAgg = await LedgerEntryModel.aggregate([
      { $match: { createdAt: { $gte: startDate, $lt: endDate } } },
      { $group: { _id: null, totalVolumeCents: { $sum: '$amountCents' }, transactionCount: { $sum: 1 } } }
    ]);

    return {
      yearMonth,
      topSellers,
      topBuyers,
      mostCommented,
      mostReactive,
      macroTotals: {
        totalVolumeCents: macroAgg[0]?.totalVolumeCents || 0,
        transactionCount: macroAgg[0]?.transactionCount || 0
      }
    };
  }
}