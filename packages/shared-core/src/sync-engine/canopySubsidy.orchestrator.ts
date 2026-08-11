// packages/shared-core/src/sync-engine/canopySubsidy.orchestrator.ts
import { SubsidyModel } from '../../../infrastructure/src/database/models/nosql/subsidy.model';
import { KomptaLedgerOrchestrator } from './komptaLedger.orchestrator';

export class CanopySubsidyOrchestrator {
  
  // Vote pour un dossier
  public static async voteForSubsidy(subsidyUid: string, voterUid: string) {
    const subsidy = await SubsidyModel.findById(subsidyUid);
    if (!subsidy.voterUids.includes(voterUid)) {
      subsidy.voterUids.push(voterUid);
      subsidy.voteCount += 1;
      await subsidy.save();
    }
  }

  // Tirage au sort mensuel (le "Chapeau de la Canopée")
 public static async executeMonthlyDraw() {
    const pendingRequests = await SubsidyModel.find({ status: 'PENDING' });
    if (!pendingRequests || pendingRequests.length === 0) return;
    
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
        referenceUid: `subsidy_${winner._id}`,
        description: `Subvention accordée : ${winner.title}`
      });
      winner.status = 'PAID';
      await winner.save();
    }
}

  private static weightedRandomDraw(top: any[], low: any[]): any {
    // Logique de tirage : on met 3 copies de chaque dossier topTier et 1 de lowTier dans le chapeau
    const pool = [...top, ...top, ...top, ...low];
    return pool[Math.floor(Math.random() * pool.length)];
  }
}