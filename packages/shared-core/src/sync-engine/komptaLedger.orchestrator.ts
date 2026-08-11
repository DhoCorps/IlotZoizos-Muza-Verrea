// packages/shared-core/src/sync-engine/komptaLedger.orchestrator.ts
import { TransactionManager } from './transactionManager';
import { KomptaLedgerService, SovereignCurrency } from '@ilot/infrastructure/';
import { IlotError } from '../errors/ilot.errors';

export interface TransferParams {
  fromUid: string;
  toUid: string;
  amount: number;
  currency: SovereignCurrency;
  category: 'TIP' | 'STORE_SALE' | 'BARTER' | 'SYSTEM_TRANSFER' | 'BET_WIN' | 'BET_LOSS' | 'CANOPY_TAX_REVENUE' | 'SUBSIDY';
  referenceUid: string;
  description: string;
}

export class KomptaLedgerOrchestrator {
  /**
   * Exécute un transfert sécurisé en partie double entre deux entités de l'Îlot
   */
  public static async transfer(params: TransferParams): Promise<void> {
    const { fromUid, toUid, amount, currency, category, referenceUid, description } = params;

    if (amount <= 0) {
      throw new IlotError("Le montant du transfert souverain doit être supérieur à zéro.", "BAD_REQUEST", 400);
    }

    await TransactionManager.execute("Transfert Souverain Kompta", async (mongoSession, _neo4jTx) => {
      // 1. Enregistrement du Débit chez l'émetteur
      await KomptaLedgerService.recordEntry({
        ownerUid: fromUid,
        counterpartyUid: toUid,
        amount,
        currency,
        type: 'DEBIT',
        category,
        referenceUid,
        description: `Débit : ${description}`,
        session: mongoSession
      });

      // 2. Enregistrement du Crédit chez le receveur
      await KomptaLedgerService.recordEntry({
        ownerUid: toUid,
        counterpartyUid: fromUid,
        amount,
        currency,
        type: 'CREDIT',
        category,
        referenceUid,
        description: `Crédit : ${description}`,
        session: mongoSession
      });
    });
  }
}