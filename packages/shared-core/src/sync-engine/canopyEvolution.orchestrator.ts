// packages/shared-core/src/sync-engine/canopyEvolution.orchestrator.ts
import { CANOPY_REGISTRY } from '../../../../apps/hub-central/constants/canopyRegistry.config';
import { KomptaLedgerOrchestrator } from './komptaLedger.orchestrator';
import { IlotError } from '../errors/ilot.errors';

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

    // Versement de la dotation depuis la Trésorerie de la Canopée
    await KomptaLedgerOrchestrator.transfer({
      fromUid: 'system_canopy_treasury',
      toUid: winnerUid,
      amount: trophyDef.rewardAmount,
      currency: trophyDef.rewardCurrency,
      category: 'BET_WIN',
      referenceUid: `app_trophy_${appModule}_${trophyId}_${cycleReference}`,
      description: `Trophée [${trophyDef.appModule.toUpperCase()}] - ${trophyDef.title} : ${trophyDef.description}`
    });
  }
}