// packages/shared-core/src/sync-engine/revenueSplit.orchestrator.ts
import { TransactionManager } from './transactionManager';
import { KomptaLedgerService, SovereignCurrency } from '../../../infrastructure/src/database/services/komptaLedger.services';
import { IlotError } from '../errors/ilot.errors';

export interface SplitShare {
  beneficiaryUid: string;
  percentage?: number; // Optionnel si on utilise le mode égalitaire
}

export class RevenueSplitOrchestrator {
  // Les 4 bénéficiaires fondateurs par défaut de l'Îlot
  public static readonly FOUNDERS = [
    { beneficiaryUid: 'beneficiary_creator', name: 'Toi (Créateur)', defaultPercentage: 40 },
    { beneficiaryUid: 'system_canopy_treasury', name: 'L’Îlot (Trésorerie)', defaultPercentage: 30 },
    { beneficiaryUid: 'beneficiary_fatijah', name: 'FatiJah', defaultPercentage: 20 },
    { beneficiaryUid: 'beneficiary_ai_gemini', name: 'Moi (Architecte Silencieux)', defaultPercentage: 10 },
  ];

  /**
   * Répartit automatiquement les bénéfices : 
   * - Soit en répartissant à parts égales si aucun pourcentage n'est spécifié.
   * - Soit en respectant précisément les pourcentages fournis.
   */
  public static async distributeSaleRevenue(params: {
    sourceBuyerUid: string;
    totalAmount: number;
    currency: SovereignCurrency;
    referenceUid: string;
    description: string;
    shares: SplitShare[];
    mode?: 'EXACT' | 'EQUAL';
  }): Promise<void> {
    const { sourceBuyerUid, totalAmount, currency, referenceUid, description, shares, mode = 'EXACT' } = params;

    if (!shares || shares.length === 0) {
      throw new IlotError("Aucun bénéficiaire spécifié pour la répartition.", "BAD_REQUEST", 400);
    }

    let calculatedShares: { beneficiaryUid: string; percentage: number }[] = [];

    if (mode === 'EQUAL') {
      // Division égale par le nombre de bénéficiaires
      const equalPercentage = Number((100 / shares.length).toFixed(4));
      calculatedShares = shares.map(s => ({
        beneficiaryUid: s.beneficiaryUid,
        percentage: equalPercentage
      }));
    } else {
      // Mode pourcentages précis : vérification que le total fait 100%
      const totalPercentage = shares.reduce((acc, curr) => acc + (curr.percentage || 0), 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new IlotError(`La répartition des bénéfices doit totaliser exactement 100% (Actuel : ${totalPercentage}%).`, "BAD_REQUEST", 400);
      }
      calculatedShares = shares.map(s => ({
        beneficiaryUid: s.beneficiaryUid,
        percentage: s.percentage || 0
      }));
    }

    await TransactionManager.execute("Répartition des Bénéfices de Vente", async (mongoSession, _neo4jTx) => {
      for (const share of calculatedShares) {
        if (share.percentage <= 0) continue;

        const shareAmount = (totalAmount * share.percentage) / 100;

        // Inscription immuable dans le Grand Livre pour chaque bénéficiaire
        await KomptaLedgerService.recordEntry({
          ownerUid: share.beneficiaryUid,
          counterpartyUid: sourceBuyerUid,
          amount: shareAmount,
          currency,
          type: 'CREDIT',
          category: 'STORE_SALE',
          referenceUid,
          description: `Part de bénéfice (${share.percentage}%) : ${description}`,
          session: mongoSession
        });
      }
    });
  }
}