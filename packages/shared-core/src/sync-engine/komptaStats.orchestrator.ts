// packages/shared-core/src/sync-engine/komptaStats.orchestrator.ts
import { LedgerEntryModel } from '../../../infrastructure/src/database/models/nosql/ledgerEntry.model';
import { CommentModel } from '../../../infrastructure/src/database/models/nosql/comment.model';
import { ReactionModel } from '../../../infrastructure/src/database/models/nosql/reaction.model';

export interface MultiCurrencyVolume {
  [currency: string]: number;
}

export interface RankedEntity {
  uid: string;
  universalEnergyVolume: number; // Volume converti selon les taux de change de l'Îlot
  balances: MultiCurrencyVolume; // Détail brut par énergie/monnaie
}

export interface MacroTotals {
  [currency: string]: {
    totalVolume: number;
    transactionCount: number;
  };
}

export interface MonthlyCanopyStats {
  yearMonth: string;
  topSellers: RankedEntity[];
  topBuyers: RankedEntity[];
  mostCommented: Array<{ _id: string; commentCount: number }>;
  mostReactive: Array<{ _id: string; reactionCount: number }>;
  macroTotals: MacroTotals;
}

export class KomptaStatsEngine {
  /**
   * ⚖️ MATRICE DES TAUX DE CHANGE SOUVERAINS (L'Étalon-Énergie)
   * Définit la valeur de chaque énergie de l'Îlot par rapport à un indice universel (ex: 1.0 = 1 centime d'Euro).
   */
  private static readonly EXCHANGE_RATES: Record<string, number> = {
    'EUR': 1.0,               // Monnaie fiduciaire (Base 1)
    'TOTAMTOE': 0.1,          // Monnaie de jeu standard
    'PLUME_SILEX': 0.5,       // Artefact Letr'in
    'SILLON_VINYLE': 0.5,     // Artefact Partita
    'ESSENCE_VENT': 2.0,      // Énergie élémentaire rare
    'ATOME_AIR': 1.5,
    'GLUON_FEU': 3.0,
    'KAOS_ORGANIQUE': 10.0,   // Énergie chaotique de très haute valeur
    'BARTER': 0.0             // Le troc pur n'a pas de valeur financière spéculative
  };

  /**
   * Convertit un volume brut dans une monnaie donnée vers l'indice d'Énergie Universelle.
   */
  private static convertToUniversalEnergy(amount: number, currency: string): number {
    const rate = this.EXCHANGE_RATES[currency.toUpperCase()] || 0.1; // Taux par défaut faible si devise inconnue
    return amount * rate;
  }

  /**
   * Compile les agrégations MongoDB multi-devises en un classement universel unifié.
   */
  private static rankByUniversalEnergy(aggregatedData: any[]): RankedEntity[] {
    const userMap = new Map<string, RankedEntity>();

    for (const entry of aggregatedData) {
      const uid = entry._id.ownerUid;
      const currency = entry._id.currency;
      const amount = entry.totalVolume;

      if (!uid || !currency) continue;

      if (!userMap.has(uid)) {
        userMap.set(uid, { uid, universalEnergyVolume: 0, balances: {} });
      }

      const userData = userMap.get(uid)!;
      userData.balances[currency] = (userData.balances[currency] || 0) + amount;
      userData.universalEnergyVolume += this.convertToUniversalEnergy(amount, currency);
    }

    // Tri par score énergétique universel décroissant et limitation au Top 5
    return Array.from(userMap.values())
      .sort((a, b) => b.universalEnergyVolume - a.universalEnergyVolume)
      .slice(0, 5);
  }

  /**
   * 🌙 Calcule et agrège toutes les métriques de la canopée pour un mois donné ("YYYY-MM")
   */
  public static async calculateMonthlyStats(yearMonth: string): Promise<MonthlyCanopyStats> {
    const startDate = new Date(`${yearMonth}-01T00:00:00Z`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // 1. Top Vendeurs (Agrégation multi-devises)
    const rawSellers = await LedgerEntryModel.aggregate([
      { $match: { createdAt: { $gte: startDate, $lt: endDate }, type: 'CREDIT', category: 'STORE_SALE' } },
      { $group: { _id: { ownerUid: '$ownerUid', currency: '$currency' }, totalVolume: { $sum: '$amountCents' } } }
    ]);
    const topSellers = this.rankByUniversalEnergy(rawSellers);

    // 2. Top Acheteurs / Mécènes (Agrégation multi-devises)
    const rawBuyers = await LedgerEntryModel.aggregate([
      { $match: { createdAt: { $gte: startDate, $lt: endDate }, type: 'DEBIT', category: { $in: ['STORE_PURCHASE', 'TIP'] } } },
      { $group: { _id: { ownerUid: '$ownerUid', currency: '$currency' }, totalVolume: { $sum: '$amountCents' } } }
    ]);
    const topBuyers = this.rankByUniversalEnergy(rawBuyers);

    // 3. L'Oiseau Écho (Commentaires)
    const mostCommented = await CommentModel.aggregate([
      { $match: { createdAt: { $gte: startDate, $lt: endDate } } },
      { $group: { _id: '$targetOwnerUid', commentCount: { $sum: 1 } } },
      { $sort: { commentCount: -1 } },
      { $limit: 5 }
    ]);

    // 4. L'Oiseau Réactif (Réactions)
    const mostReactive = await ReactionModel.aggregate([
      { $match: { createdAt: { $gte: startDate, $lt: endDate } } },
      { $group: { _id: '$senderUid', reactionCount: { $sum: 1 } } },
      { $sort: { reactionCount: -1 } },
      { $limit: 5 }
    ]);

    // 5. Macro Totaux financiers (Sécurisés par devise)
    const rawMacro = await LedgerEntryModel.aggregate([
      { $match: { createdAt: { $gte: startDate, $lt: endDate } } },
      { $group: { _id: '$currency', totalVolume: { $sum: '$amountCents' }, transactionCount: { $sum: 1 } } }
    ]);

    const macroTotals: MacroTotals = rawMacro.reduce((acc, curr) => {
      if (curr._id) {
        acc[curr._id] = { totalVolume: curr.totalVolume, transactionCount: curr.transactionCount };
      }
      return acc;
    }, {} as MacroTotals);

    return {
      yearMonth,
      topSellers,
      topBuyers,
      mostCommented: mostCommented || [],
      mostReactive: mostReactive || [],
      macroTotals
    };
  }
}