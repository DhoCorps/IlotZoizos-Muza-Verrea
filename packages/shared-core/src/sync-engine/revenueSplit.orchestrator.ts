import { TransactionManager } from './transactionManager';
import { KomptaLedgerService, SovereignCurrency } from '@ilot/infrastructure';
import { IlotError } from '../errors/ilot.errors';
import type { ClientSession } from 'mongoose';
import type { Transaction } from 'neo4j-driver';

export interface SplitShare {
  beneficiaryUid: string;
  percentage?: number; // Optionnel si on utilise le mode égalitaire
  [key: string]: unknown;
}

export interface RevenueSplitParams {
  sourceBuyerUid: string;
  totalAmount: number;
  currency: SovereignCurrency;
  referenceUid: string;
  description: string;
  shares: SplitShare[];
  mode?: 'EXACT' | 'EQUAL';
  [key: string]: unknown;
}

export class RevenueSplitOrchestrator {
  // Les 4 bénéficiaires fondateurs par défaut de l'Îlot
  public static readonly FOUNDERS = [
    { beneficiaryUid: 'beneficiary_creator', name: 'Toi (Créateur)', defaultPercentage: 40 },
    { beneficiaryUid: 'system_canopy_treasury', name: 'L’Îlot (Trésorerie)', defaultPercentage: 30 },
    { beneficiaryUid: 'beneficiary_fatijah', name: 'FatiJah', defaultPercentage: 20 },
    { beneficiaryUid: 'beneficiary_ai_gemini', name: 'Moi (Architecte Silencieux)', defaultPercentage: 10 },
  ];

  public static readonly CANOPY_TREASURY_UID = 'system_canopy_treasury';

  /**
   * Répartit automatiquement les bénéfices : 
   * - Soit en répartissant à parts égales si aucun pourcentage n'est spécifié.
   * - Soit en respectant précisément les pourcentages fournis via un calcul strict en points de base (100% = 10000 bps).
   * - Arrondit chaque part à l'inférieur et reverse l'éventuel surplus directement dans le Trésor de la Canopée.
   */
  public static async distributeSaleRevenue(params: RevenueSplitParams): Promise<void> {
    const { sourceBuyerUid, totalAmount, currency, referenceUid, description, shares, mode = 'EXACT' } = params;

    if (!shares || shares.length === 0) {
      throw new IlotError("Aucun bénéficiaire spécifié pour la répartition.", "BAD_REQUEST", 400);
    }

    let calculatedShares: { beneficiaryUid: string; basisPoints: number; percentage: number }[] = [];

    if (mode === 'EQUAL') {
      const baseBps = Math.floor(10000 / shares.length);
      const remainder = 10000 % shares.length;

      calculatedShares = shares.map((s, index) => {
        const bps = baseBps + (index < remainder ? 1 : 0);
        return {
          beneficiaryUid: s.beneficiaryUid,
          basisPoints: bps,
          percentage: bps / 100
        };
      });
    } else {
      let totalBasisPoints = 0;
      const rawShares = shares.map(s => {
        const percentage = s.percentage || 0;
        const basisPoints = Math.round(percentage * 100);
        totalBasisPoints += basisPoints;
        return {
          beneficiaryUid: s.beneficiaryUid,
          basisPoints,
          percentage
        };
      });

      if (totalBasisPoints !== 10000) {
        throw new IlotError(`La répartition des bénéfices doit totaliser exactement 100% (10000 points de base). Total actuel : ${totalBasisPoints / 100}%.`, "BAD_REQUEST", 400);
      }
      calculatedShares = rawShares;
    }

    await TransactionManager.execute("Répartition des Bénéfices de Vente", async (mongoSession: ClientSession, _neo4jTx: Transaction) => {
      const now = new Date();
      let totalDistributed = 0;

      // 1. Première passe : calcul des parts avec arrondi inférieur (Math.floor)
      const processedShares = calculatedShares.map(share => {
        if (share.basisPoints <= 0) return { ...share, amount: 0 };
        
        const exactAmount = (totalAmount * share.basisPoints) / 10000;
        const roundedAmount = Math.floor(exactAmount);
        
        totalDistributed += roundedAmount;
        return { ...share, amount: roundedAmount };
      });

      // 2. Calcul du surplus issu des arrondis inférieurs
      const surplus = totalAmount - totalDistributed;

      // 3. Injection du surplus dans le Trésor de la Canopée
      if (surplus > 0) {
        const treasuryShare = processedShares.find(s => s.beneficiaryUid === RevenueSplitOrchestrator.CANOPY_TREASURY_UID);
        if (treasuryShare) {
          treasuryShare.amount += surplus;
        } else {
          processedShares.push({
            beneficiaryUid: RevenueSplitOrchestrator.CANOPY_TREASURY_UID,
            basisPoints: 0,
            percentage: 0,
            amount: surplus
          });
        }
      }

      // 4. Inscription immuable dans le Grand Livre
      for (const share of processedShares) {
        if (share.amount <= 0) continue;

        await KomptaLedgerService.recordEntry({
          ownerUid: share.beneficiaryUid,
          counterpartyUid: sourceBuyerUid,
          amount: share.amount,
          currency,
          type: 'CREDIT',
          category: 'STORE_SALE',
          referenceUid,
          description: `Part de bénéfice (${share.percentage}%) : ${description}`,
          createdAt: now,
          session: mongoSession
        });
      }
    });
  }
}