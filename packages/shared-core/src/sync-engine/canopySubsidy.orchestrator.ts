import { SubsidyModel } from '@ilot/infrastructure';
import { KomptaLedgerOrchestrator } from './komptaLedger.orchestrator';
import { SovereignCurrency } from '@ilot/infrastructure';

export interface ISubsidyDocument {
  _id: unknown;
  uid: string;
  requesterUid: string;
  requestedAmount: number;
  currency: SovereignCurrency;
  title: string;
  status: 'PENDING' | 'PAID' | 'REJECTED';
  voteCount: number;
  voterUids: string[];
  updatedAt: Date;
  save(): Promise<unknown>;
  [key: string]: unknown;
}

export class CanopySubsidyOrchestrator {
  /**
   * Vote pour un dossier de subvention
   */
  public static async voteForSubsidy(subsidyUid: string, voterUid: string): Promise<void> {
    const subsidy = (await SubsidyModel.findById(subsidyUid)) as unknown as ISubsidyDocument | null;
    if (!subsidy) return;

    if (!subsidy.voterUids.includes(voterUid)) {
      // ⏱️ SYNCHRONISATION DES HORODATAGES : Constante unique 'now'
      const now = new Date();

      subsidy.voterUids.push(voterUid);
      subsidy.voteCount += 1;
      subsidy.updatedAt = now;
      await subsidy.save();
    }
  }

  /**
   * Tirage au sort mensuel (le "Chapeau de la Canopée")
   */
  public static async executeMonthlyDraw(): Promise<void> {
    const pendingRequests = (await SubsidyModel.find({ status: 'PENDING' })) as unknown as ISubsidyDocument[];
    if (!pendingRequests || pendingRequests.length === 0) return;

    // ⏱️ SYNCHRONISATION DES HORODATAGES : Constante unique 'now' pour le tirage et le paiement
    const now = new Date();

    const topTier = pendingRequests.filter(r => r.voteCount > 10);
    const lowTier = pendingRequests.filter(r => r.voteCount <= 10);
    const winner = this.weightedRandomDraw(topTier, lowTier);

    if (winner) {
      await KomptaLedgerOrchestrator.transfer({
        fromUid: 'system_canopy_treasury',
        toUid: winner.requesterUid,
        amount: winner.requestedAmount,
        currency: winner.currency,
        category: 'SUBSIDY',
        referenceUid: `subsidy_${String(winner._id)}_${now.getTime()}`,
        description: `Subvention accordée : ${winner.title}`
      });

      winner.status = 'PAID';
      winner.updatedAt = now;
      await winner.save();
    }
  }

  private static weightedRandomDraw(top: ISubsidyDocument[], low: ISubsidyDocument[]): ISubsidyDocument | null {
    // Logique de tirage : on met 3 copies de chaque dossier topTier et 1 de lowTier dans le chapeau
    const pool = [...top, ...top, ...top, ...low];
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }
}