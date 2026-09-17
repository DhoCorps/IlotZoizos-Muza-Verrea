import { LedgerEntryModel, CommentModel, ReactionModel } from '@ilot/infrastructure';

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

interface IAggregatedLedgerEntry {
  _id: {
    ownerUid?: string;
    currency?: string;
  } | string;
  totalVolume: number;
  transactionCount?: number;
  [key: string]: unknown;
}

export class KomptaStatsEngine {
  /**
   * ⚖️ MATRICE DES TAUX DE CHANGE SOUVERAINS (L'Étalon-Énergie)
   * Définit la valeur de chaque énergie de l'Îlot par rapport à un indice universel (ex: 1.0 = 1 centime d'Euro).
   */
  private static readonly EXCHANGE_RATES: Record<string, number> = {
    'EUR': 1.0,                     // Monnaie fiduciaire (Base 1)
    'TOTAMTOE': 0.1,                // Monnaie de jeu standard
    'PLUME_SILEX': 0.5,         // Artefact Letr'in
    'SILLON_VINYLE': 0.5,       // Artefact Partita
    'ESSENCE_VENT': 2.0,        // Énergie élémentaire rare
    'ATOME_AIR': 1.5,
    'GLUON_FEU': 3.0,
    'KAOS_ORGANIQUE': 10.0,     // Énergie chaotique de très haute valeur
    'BARTER': 0.0                   // Le troc pur n'a pas de valeur financière spéculative
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
  private static rankByUniversalEnergy(aggregatedData: IAggregatedLedgerEntry[]): RankedEntity[] {
    const userMap = new Map<string, RankedEntity>();

    for (const entry of aggregatedData) {
      if (!entry._id || typeof entry._id === 'string') continue;
      
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
   * 🛡️ Sécurisé par des bornes temporelles strictes normalisées en UTC anti-dérive d'horloge.
   */
  public static async calculateMonthlyStats(yearMonth: string): Promise<MonthlyCanopyStats> {
    // Validation du format YYYY-MM
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
      throw new Error(`Format de mois invalide : "${yearMonth}". Attendu : "YYYY-MM".`);
    }

    // ⏱️ SYNCHRONISATION ET NORMALISATION DES BORNES TEMPORELLES UTC STRICTES
    const startDate = new Date(`${yearMonth}-01T00:00:00.000Z`);
    
    // Calcul sécurisé du mois suivant pour éviter les décalages de fuseau horaire
    const [yearStr, monthStr] = yearMonth.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10); // 1-12
    
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    const nextYearMonth = `${year}-${String(month).padStart(2, '0')}`;
    const endDate = new Date(`${nextYearMonth}-01T00:00:00.000Z`);

    // 🚀 PARALLÉLISATION MASSIVE : On lance toutes les agrégations en même temps
    const [rawSellers, rawBuyers, mostCommented, mostReactive, rawMacro] = await Promise.all([
      // 1. Top Vendeurs (Agrégation multi-devises)
      LedgerEntryModel.aggregate([
        { $match: { createdAt: { $gte: startDate, $lt: endDate }, type: 'CREDIT', category: 'STORE_SALE' } },
        { $group: { _id: { ownerUid: '$ownerUid', currency: '$currency' }, totalVolume: { $sum: '$amountCents' } } }
      ]) as unknown as IAggregatedLedgerEntry[],
      // 2. Top Acheteurs / Mécènes (Agrégation multi-devises)
      LedgerEntryModel.aggregate([
        { $match: { createdAt: { $gte: startDate, $lt: endDate }, type: 'DEBIT', category: { $in: ['STORE_PURCHASE', 'TIP'] } } },
        { $group: { _id: { ownerUid: '$ownerUid', currency: '$currency' }, totalVolume: { $sum: '$amountCents' } } }
      ]) as unknown as IAggregatedLedgerEntry[],
      // 3. L'Oiseau Écho (Commentaires)
      CommentModel.aggregate([
        { $match: { createdAt: { $gte: startDate, $lt: endDate } } },
        { $group: { _id: '$targetOwnerUid', commentCount: { $sum: 1 } } },
        { $sort: { commentCount: -1 } },
        { $limit: 5 }
      ]) as unknown as Array<{ _id: string; commentCount: number }>,
      // 4. L'Oiseau Réactif (Réactions)
      ReactionModel.aggregate([
        { $match: { createdAt: { $gte: startDate, $lt: endDate } } },
        { $group: { _id: '$senderUid', reactionCount: { $sum: 1 } } },
        { $sort: { reactionCount: -1 } },
        { $limit: 5 }
      ]) as unknown as Array<{ _id: string; reactionCount: number }>,
      // 5. Macro Totaux financiers (Sécurisés par devise)
      LedgerEntryModel.aggregate([
        { $match: { createdAt: { $gte: startDate, $lt: endDate } } },
        { $group: { _id: '$currency', totalVolume: { $sum: '$amountCents' }, transactionCount: { $sum: 1 } } }
      ]) as unknown as IAggregatedLedgerEntry[]
    ]);

    // Résolution des classements universels
    const topSellers = this.rankByUniversalEnergy(rawSellers);
    const topBuyers = this.rankByUniversalEnergy(rawBuyers);

    const macroTotals: MacroTotals = rawMacro.reduce((acc: MacroTotals, curr: IAggregatedLedgerEntry) => {
      if (curr._id && typeof curr._id === 'string') {
        acc[curr._id] = { totalVolume: curr.totalVolume, transactionCount: curr.transactionCount || 0 };
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