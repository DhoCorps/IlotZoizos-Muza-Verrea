import { TransactionManager } from './transactionManager';
import { KomptaLedgerService, SovereignCurrency } from '@ilot/infrastructure';
import { IlotError } from '../errors/ilot.errors';

export interface TransferParams {
  fromUid: string;
  fromPseudo?: string; // 🚀 NOUVEAU : Pseudo de l'émetteur (Acheteur)
  toUid: string;
  toPseudo?: string;   // 🚀 NOUVEAU : Pseudo du destinataire (Vendeur)
  amountCents: number; // 🚀 NOUVEAU : Harmonisation en centimes pour l'ERP
  amountHTCents?: number; // 🚀 NOUVEAU : Ventilation HT
  taxCents?: number;      // 🚀 NOUVEAU : TVA applicable
  feeCents?: number;      // 🚀 NOUVEAU : Frais de plateforme / Stripe
  currency: SovereignCurrency;
  category: 'TIP' | 'STORE_SALE' | 'STORE_PURCHASE' | 'BARTER' | 'SYSTEM_TRANSFER' | 'BET_WIN' | 'BET_LOSS' | 'CANOPY_TAX_REVENUE' | 'SUBSIDY' | 'EXTERNAL_DEPOSIT';
  referenceUid: string;
  orderUid?: string;   // 🚀 NOUVEAU : Lien direct avec la BDD Orders
  invoiceUid?: string; // 🚀 NOUVEAU : Lien direct avec la facture PDF
  description: string;
}

export class KomptaLedgerOrchestrator {
  /**
   * Exécute un transfert sécurisé en partie double entre deux entités de l'Îlot.
   * Gère la fiscalité complète (HT, TVA, Frais), le croisement des contreparties,
   * ET tisse l'empreinte économique dans le graphe social (Neo4j).
   */
  public static async transfer(params: TransferParams): Promise<void> {
    const { 
      fromUid, fromPseudo, 
      toUid, toPseudo, 
      amountCents, amountHTCents, taxCents, feeCents, 
      currency, category, referenceUid, orderUid, invoiceUid, description 
    } = params;

    // 🛡️ CORRECTION CYBERSÉCURITÉ : Le montant principal (exprimé en unités ou centimes)
    // ne doit pas être un nombre flottant corrompu et on s'assure qu'il est strictement positif.
    if (amountCents <= 0) {
      throw new IlotError("Le montant du transfert souverain doit être supérieur à zéro.", "BAD_REQUEST", 400);
    }

    await TransactionManager.execute("Transfert Souverain Kompta", async (mongoSession, neo4jTx) => {
      // ⏱️ SYNCHRONISATION DES HORODATAGES : Constante unique 'now' pour garantir la symétrie temporelle
      const now = new Date();

      // 🧠 LOGIQUE DE MIROIR : Si le marchand fait une vente, l'acheteur fait un achat.
      const debitCategory = category === 'STORE_SALE' ? 'STORE_PURCHASE' : category;

      // 1. Enregistrement du Débit chez l'émetteur (Celui qui paie)
      await KomptaLedgerService.recordEntry({
        ownerUid: fromUid,
        counterpartyUid: toUid,
        counterpartyPseudo: toPseudo, // Il voit à qui il a envoyé les fonds
        amountCents,
        amountHTCents,
        taxCents,
        feeCents,
        currency,
        type: 'DEBIT',
        category: debitCategory, 
        referenceUid,
        orderUid,
        invoiceUid,
        description: `Débit : ${description}`,
        createdAt: now,
        session: mongoSession
      });

      // 2. Enregistrement du Crédit chez le receveur (Celui qui encaisse)
      await KomptaLedgerService.recordEntry({
        ownerUid: toUid,
        counterpartyUid: fromUid,
        counterpartyPseudo: fromPseudo, // Il voit qui l'a payé
        amountCents,
        amountHTCents,
        taxCents,
        feeCents,
        currency,
        type: 'CREDIT',
        category, 
        referenceUid,
        orderUid,
        invoiceUid,
        description: `Crédit : ${description}`,
        createdAt: now,
        session: mongoSession
      });

      // 3. 🕸️ SÉDIMENTATION NEO4J : Tissage du lien économique
      // On sédimente uniquement si l'échange a lieu entre deux oiseaux distincts
      if (fromUid !== toUid) {
        const cypher = `
          MATCH (buyer:User {uid: $fromUid})
          MATCH (seller:User {uid: $toUid})
          MERGE (buyer)-[r:TRANSACTED_WITH {currency: $currency}]->(seller)
          ON CREATE SET 
            r.totalVolumeCents = $amountCents, 
            r.transactionCount = 1, 
            r.lastTransactionAt = datetime($now)
          ON MATCH SET 
            r.totalVolumeCents = r.totalVolumeCents + $amountCents, 
            r.transactionCount = r.transactionCount + 1, 
            r.lastTransactionAt = datetime($now)
        `;
        
        await neo4jTx.run(cypher, {
          fromUid,
          toUid,
          currency,
          amountCents,
          now: now.toISOString()
        });
      }
    });
  }
}