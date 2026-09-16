import { OiseauModel, LedgerEntryModel } from '@ilot/infrastructure';

export interface PantheonEntry {
  uid: string;
  pseudo: string;
  avatarUrl?: string;
  resonanceScore: number;
  financialEnergy: number;
  praisesCount: number;
  matrixScore: number;
}

export class UniversHallPantheonOrchestrator {
  /**
   * Calcule et fusionne les signaux hétérogènes (Financier, Éloges, Activité Graphe)
   * pour extraire le Panthéon d'élite des Oiseaux de la Canopée.
   */
  public static async calculatePantheon(yearMonth?: string): Promise<PantheonEntry[]> {
    // 1. Récupération des profils d'Oiseaux avec leur compteur d'éloges
    const birds = await OiseauModel.find({ isBanned: { $ne: true } })
      .select('uid pseudo avatarUrl praisesCount')
      .lean();

    if (!birds || birds.length === 0) return [];

    // 2. Agrégation des volumes financiers (KomptaStats) si une période est ciblée ou global
    let financialMap = new Map<string, number>();
    try {
      const matchQuery: any = { type: 'CREDIT' };
      if (yearMonth) {
        const startDate = new Date(`${yearMonth}-01T00:00:00Z`);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);
        matchQuery.createdAt = { $gte: startDate, $lt: endDate };
      }

      const rawLedger = await LedgerEntryModel.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$ownerUid', totalVolume: { $sum: '$amountCents' } } }
      ]);

      rawLedger.forEach((entry: any) => {
        if (entry._id) {
          financialMap.set(entry._id, entry.totalVolume / 100); // Conversion en unités principales
        }
      });
    } catch (err) {
      console.warn("  [Pantheon] Impossible d'agréger le grand livre, repli à 0 pour le score financier.", err);
    }

    // 3. Fusion pondérée des signaux hétérogènes en un Indice de Résonance Unique
    const scoredBirds: PantheonEntry[] = birds.map((bird: any) => {
      const uid = bird.uid;
      const praisesCount = bird.praisesCount || 0;
      const financialEnergy = financialMap.get(uid) || 0;
      
      // Simulation ou prise en compte d'un score Neo4j brut stocké sur le profil si présent
      const matrixScore = bird.totalResonance || bird.demopraxyExScore ? 10 : 5;

      // Formule d'harmonisation de l'Îlot : 
      // Résonance = (Volume Financier * 0.4) + (Éloges * 15.0) + (Activité Graphe * 10.0)
      const resonanceScore = Number((
        (financialEnergy * 0.4) + 
        (praisesCount * 15.0) + 
        (matrixScore * 10.0)
      ).toFixed(2));

      return {
        uid,
        pseudo: bird.pseudo || 'Oiseau Anonyme',
        avatarUrl: bird.avatarUrl || null,
        resonanceScore,
        financialEnergy,
        praisesCount,
        matrixScore
      };
    });

    // Tri par Indice de Résonance décroissant et limitation au Top 10 de l'élite
    return scoredBirds
      .sort((a, b) => b.resonanceScore - a.resonanceScore)
      .slice(0, 10);
  }
}