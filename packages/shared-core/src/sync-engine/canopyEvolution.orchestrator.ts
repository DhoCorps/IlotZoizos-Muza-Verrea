import { CANOPY_REGISTRY } from '../../../../apps/hub-central/constants/canopyRegistry.config';
import { KomptaLedgerOrchestrator } from './komptaLedger.orchestrator';
import { IlotError } from '../errors/ilot.errors';
import { TransactionManager } from './transactionManager';
import { CanopyAwardModel } from '@ilot/infrastructure';

export interface SampleSaleStats {
  sampleUid: string;
  ownerUid: string;
  totalSold: number;
  maxPrice: number;
  minPrice: number;
  averagePrice: number;
}

export class CanopyEvolutionOrchestrator {
  /**
   * Évalue et attribue un trophée pour une application spécifique (ex: Samplotek, Letr'in, Games)
   * Protégé par une double écriture atomique (Ledger + MongoDB + Neo4j)
   */
  public static async awardAppTrophy(params: {
    winnerUid: string;
    trophyId: string;
    appModule: string;
    cycleReference: string;
  }): Promise<void> {
    const { winnerUid, trophyId, appModule, cycleReference } = params;

    const trophyDef = CANOPY_REGISTRY.appTrophies.find(
      t => t.id === trophyId && t.appModule === appModule
    );

    if (!trophyDef) {
      throw new IlotError(`Trophée introuvable pour l'application [${appModule}] : ${trophyId}`, "NOT_FOUND", 404);
    }

    // ⏱️ SYNCHRONISATION DES HORODATAGES : Constante unique 'now'
    const now = new Date();

    // 🌿 DÉLÉGATION AU TRANSACTION MANAGER (Double Écriture)
    await TransactionManager.execute(`Attribution Trophée App [${appModule}]`, async (mongoSession, neo4jTx) => {
      
      // 1. Versement de la dotation financière (Ledger) avec amountCents
      await KomptaLedgerOrchestrator.transfer({
        fromUid: 'system_canopy_treasury',
        toUid: winnerUid,
        amountCents: trophyDef.rewardAmount,
        currency: trophyDef.rewardCurrency,
        category: 'BET_WIN',
        referenceUid: `app_trophy_${appModule}_${trophyId}_${cycleReference}_${now.getTime()}`,
        description: `Trophée [${trophyDef.appModule.toUpperCase()}] - ${trophyDef.title} : ${trophyDef.description}`
      });

      // 2. Traçabilité dans la Silice (MongoDB)
      await CanopyAwardModel.findOneAndUpdate(
        { yearMonth: cycleReference, awardKey: trophyId },
        {
          yearMonth: cycleReference,
          awardKey: trophyId,
          title: trophyDef.title,
          recipientUid: winnerUid,
          category: 'CUSTOM', // Catégorie générique pour les trophées d'applications
          loreDescription: trophyDef.description,
          awardedAt: now,
        },
        { upsert: true, new: true, session: mongoSession }
      );

      // 3. Ancrage du Prestige dans le Graphe (Neo4j)
      await neo4jTx.run(`
        MATCH (u:User { uid: $winnerUid })
        MERGE (a:CanopyAward { awardKey: $awardKey, yearMonth: $yearMonth })
        ON CREATE SET 
          a.title = $title, 
          a.category = 'CUSTOM', 
          a.awardedAt = datetime($now)
        MERGE (u)-[:RECEIVED_AWARD { at: datetime($now) }]->(a)
      `, {
        winnerUid,
        awardKey: trophyId,
        yearMonth: cycleReference,
        title: trophyDef.title,
        now: now.toISOString()
      });

      console.log(`✨ [Canopy Evolution] Trophée ${trophyDef.title} décerné à ${winnerUid}`);
    });
  }
}