import { TransactionManager } from './transactionManager';
import { IlotError } from '../errors/ilot.errors';
import { ActionSignature } from '@ilot/types';
import { WalletModel, KomptaLedgerService, SovereignCurrency } from '@ilot/infrastructure';
import { safeSyncUniversalInteraction } from '../utils/orchestrator.engine';

export interface DirectTransferPayload {
  transferUid: string;
  senderUid: string;
  recipientUid: string;
  amountCents: number;
  currency: string;
  sourcePage?: string;
  description?: string;
  [key: string]: unknown;
}

export interface DirectStoreTransactionPayload {
  transactionUid: string;
  buyerUid: string;
  recipientUid: string;
  amountCents: number;
  currency: string;
  storeUid?: string;
  sourcePage?: string;
  description?: string;
  [key: string]: unknown;
}

export interface ItemExchangeTransactionPayload {
  exchangeUid: string;
  senderUid: string;        
  recipientUid: string;     
  offeredItemUid: string;  
  targetTitle: string;     
  description?: string;
  [key: string]: unknown;
}

export interface ExternalPaymentPayload {
  id: string;
  amount: number; // Montant brut en centimes reçu par le webhook
  currency: string;
  metadata?: {
    recipientUid?: string;
    [key: string]: unknown;
  };
  customer?: string;
  [key: string]: unknown;
}

export class KomptaPaymentOrchestrator {
  /**
   * 🏛️ CONSTANTE DE REDISTRIBUTION (La Sève de l'Îlot)
   * Prélèvement automatique de 1% sur les flux marchands pour alimenter le Trésor de la Canopée
   */
  private static readonly CANOPY_TAX_RATE = 0.01; 
  private static readonly CANOPY_TREASURY_UID = 'SYSTEM_CANOPY_TREASURY';

  /**
   * 🦅 TRANSFERT DIRECT P2P SÉCURISÉ (Zéro taxe sur le P2P pur, traçabilité Grand Livre)
   */
  public async executeDirectTransfer(
    payload: DirectTransferPayload,
    signature: ActionSignature
  ): Promise<{ success: boolean; transferUid: string; newSenderBalance: number }> {
    
    if (!signature.actorUid || signature.actorUid !== payload.senderUid) {
      throw new IlotError("Aura financière insuffisante ou usurpation d'identité détectée.", "UNAUTHORIZED", 401);
    }

    if (payload.amountCents <= 0 || !Number.isInteger(payload.amountCents)) {
      throw new IlotError("Le montant du transfert en centimes doit être un entier strict et positif.", "BAD_REQUEST", 400);
    }

    if (payload.senderUid === payload.recipientUid) {
      throw new IlotError("Un oiseau ne peut pas s'auto-transférer des fonds.", "BAD_REQUEST", 400);
    }

    const result = await TransactionManager.execute("Transfert Direct P2P & Kompta", async (mongoSession, neo4jTx) => {
      const now = new Date();

      const senderWallet = await WalletModel.findOne({ userId: payload.senderUid }).session(mongoSession);
      if (!senderWallet) {
        throw new IlotError("Portefeuille de l'expéditeur introuvable dans la Silice.", "NOT_FOUND", 404);
      }

      if (senderWallet.balance < payload.amountCents) {
        throw new IlotError(`Fonds insuffisants dans le nid. Solde : ${senderWallet.balance / 100} ${senderWallet.currency}`, "PAYMENT_REQUIRED", 402);
      }

      let recipientWallet = await WalletModel.findOne({ userId: payload.recipientUid }).session(mongoSession);
      if (!recipientWallet) {
        recipientWallet = new WalletModel({
          userId: payload.recipientUid,
          balance: 0,
          currency: payload.currency,
          linkedAccounts: []
        });
      }

      senderWallet.balance -= payload.amountCents;
      recipientWallet.balance += payload.amountCents;

      senderWallet.updatedAt = now;
      recipientWallet.updatedAt = now;

      await senderWallet.save({ session: mongoSession });
      await recipientWallet.save({ session: mongoSession });

      await KomptaLedgerService.recordEntry({
        ownerUid: payload.senderUid,
        counterpartyUid: payload.recipientUid,
        amount: payload.amountCents / 100,
        amountCents: payload.amountCents,
        currency: payload.currency as SovereignCurrency,
        type: 'DEBIT',
        category: 'SYSTEM_TRANSFER',
        referenceUid: payload.transferUid,
        description: payload.description || 'Transfert P2P sortant',
        createdAt: now,
        session: mongoSession
      });

      await KomptaLedgerService.recordEntry({
        ownerUid: payload.recipientUid,
        counterpartyUid: payload.senderUid,
        amount: payload.amountCents / 100,
        amountCents: payload.amountCents,
        currency: payload.currency as SovereignCurrency,
        type: 'CREDIT',
        category: 'SYSTEM_TRANSFER',
        referenceUid: payload.transferUid,
        description: payload.description || 'Transfert P2P entrant',
        createdAt: now,
        session: mongoSession
      });

      const cypher = `
        MATCH (sender:User {uid: $senderUid})
        MATCH (recipient:User {uid: $recipientUid})
        CREATE (t:Transaction {
          uid: $transferUid,
          amountCents: $amountCents,
          currency: $currency,
          sourcePage: $sourcePage,
          description: $description,
          createdAt: datetime($now)
        })
        CREATE (sender)-[:SENT_PAYMENT]->(t)
        CREATE (t)-[:RECEIVED_PAYMENT]->(recipient)
        RETURN t.uid AS txUid
      `;

      const neoResult = await neo4jTx.run(cypher, {
        transferUid: payload.transferUid,
        senderUid: payload.senderUid,
        recipientUid: payload.recipientUid,
        amountCents: payload.amountCents,
        currency: payload.currency,
        sourcePage: payload.sourcePage || 'direct_canopy',
        description: payload.description || 'Transfert direct 1-clic',
        now: now.toISOString()
      });

      if (!neoResult.records || neoResult.records.length === 0) {
        throw new IlotError("Échec du scellement de la transaction financière dans le Graphe.", "INTERNAL_ERROR", 500);
      }

      return {
        success: true,
        transferUid: payload.transferUid,
        newSenderBalance: senderWallet.balance
      };
    });

    // 🛡️ SÉCURISATION DU TISSAGE UNIVERSEL VIA L'UTILITAIRE GLOBAL
    if (payload.senderUid !== payload.recipientUid) {
      await safeSyncUniversalInteraction(payload.senderUid, payload.recipientUid, 'ECOMMERCE', 'executeDirectTransfer');
    }

    return result;
  }

  /**
   * 🦅 MOTEUR DE TRANSACTION MARCHANDE (Client ➔ Vendeur avec Redistribution Canopée)
   */
  public async executeStoreTransaction(
    payload: DirectStoreTransactionPayload,
    signature: ActionSignature
  ): Promise<{ success: boolean; transactionUid: string; newBuyerBalance: number; newRecipientBalance: number }> {

    const isBuyer = signature.actorUid === payload.buyerUid;
    const isArchitect = signature.capabilities.includes('*');

    if (!signature.actorUid || (!isBuyer && !isArchitect)) {
      throw new IlotError("Aura d'authentification insuffisante pour autoriser ce paiement direct.", "UNAUTHORIZED", 401);
    }

    if (payload.amountCents <= 0 || !Number.isInteger(payload.amountCents)) {
      throw new IlotError("Le montant de la transaction en centimes doit être un entier strict et positif.", "BAD_REQUEST", 400);
    }

    if (payload.buyerUid === payload.recipientUid) {
      throw new IlotError("Un oiseau ne peut pas effectuer une transaction marchande avec lui-même.", "BAD_REQUEST", 400);
    }

    const result = await TransactionManager.execute("Transaction Marchande & Redistribution", async (mongoSession, neo4jTx) => {
      const now = new Date();

      const buyerWallet = await WalletModel.findOne({ userId: payload.buyerUid }).session(mongoSession);
      if (!buyerWallet) {
        throw new IlotError("Portefeuille de l'acheteur introuvable dans la Silice.", "NOT_FOUND", 404);
      }

      if (buyerWallet.balance < payload.amountCents) {
        throw new IlotError(`Fonds insuffisants pour finaliser l'achat. Solde : ${buyerWallet.balance / 100} ${buyerWallet.currency}`, "PAYMENT_REQUIRED", 402);
      }

      let recipientWallet = await WalletModel.findOne({ userId: payload.recipientUid }).session(mongoSession);
      if (!recipientWallet) {
        recipientWallet = new WalletModel({
          userId: payload.recipientUid,
          balance: 0,
          currency: payload.currency,
          linkedAccounts: []
        });
      }

      const canopyTaxCents = Math.floor(payload.amountCents * KomptaPaymentOrchestrator.CANOPY_TAX_RATE);
      const netMerchantAmountCents = payload.amountCents - canopyTaxCents;

      let treasuryWallet = await WalletModel.findOne({ userId: KomptaPaymentOrchestrator.CANOPY_TREASURY_UID }).session(mongoSession);
      if (!treasuryWallet) {
        treasuryWallet = new WalletModel({
          userId: KomptaPaymentOrchestrator.CANOPY_TREASURY_UID,
          balance: 0,
          currency: payload.currency,
          linkedAccounts: []
        });
      }

      buyerWallet.balance -= payload.amountCents;
      recipientWallet.balance += netMerchantAmountCents;
      treasuryWallet.balance += canopyTaxCents;

      buyerWallet.updatedAt = now;
      recipientWallet.updatedAt = now;
      treasuryWallet.updatedAt = now;

      await buyerWallet.save({ session: mongoSession });
      await recipientWallet.save({ session: mongoSession });
      await treasuryWallet.save({ session: mongoSession });

      await KomptaLedgerService.recordEntry({
        ownerUid: payload.buyerUid,
        counterpartyUid: payload.recipientUid,
        amount: payload.amountCents / 100,
        amountCents: payload.amountCents,
        currency: payload.currency as SovereignCurrency,
        type: 'DEBIT',
        category: 'STORE_PURCHASE',
        referenceUid: payload.transactionUid,
        description: payload.description || 'Achat d\'artefact sur la boutique',
        createdAt: now,
        session: mongoSession
      });

      await KomptaLedgerService.recordEntry({
        ownerUid: payload.recipientUid,
        counterpartyUid: payload.buyerUid,
        amount: payload.amountCents / 100,
        amountCents: netMerchantAmountCents,
        currency: payload.currency as SovereignCurrency,
        type: 'CREDIT',
        category: 'STORE_SALE',
        referenceUid: payload.transactionUid,
        description: `Vente d'artefact (Net après taxe de redistribution)`,
        createdAt: now,
        session: mongoSession
      });

      if (canopyTaxCents > 0) {
        await KomptaLedgerService.recordEntry({
          ownerUid: KomptaPaymentOrchestrator.CANOPY_TREASURY_UID,
          counterpartyUid: payload.buyerUid,
          amount: payload.amountCents / 100,
          amountCents: canopyTaxCents,
          currency: payload.currency as SovereignCurrency,
          type: 'CREDIT',
          category: 'CANOPY_TAX_REVENUE',
          referenceUid: payload.transactionUid,
          description: 'Prélèvement souverain de redistribution (1%)',
          createdAt: now,
          session: mongoSession
        });
      }

      let cypher = `
        MATCH (buyer:User {uid: $buyerUid})
        MATCH (recipient:User {uid: $recipientUid})
        CREATE (tx:StoreTransaction {
          uid: $transactionUid,
          amountCents: $amountCents,
          netMerchantAmountCents: $netMerchantAmountCents,
          canopyTaxCents: $canopyTaxCents,
          currency: $currency,
          sourcePage: $sourcePage,
          description: $description,
          createdAt: datetime($now)
        })
        CREATE (buyer)-[:PAID_TRANSACTION]->(tx)
        CREATE (tx)-[:CREDITED_TO]->(recipient)
      `;

      if (payload.storeUid) {
        cypher += `
          WITH tx
          MATCH (store:Store {uid: $storeUid})
          CREATE (tx)-[:PROCESSED_THROUGH]->(store)
        `;
      }

      cypher += ` RETURN tx.uid AS txUid`;

      const neoResult = await neo4jTx.run(cypher, {
        transactionUid: payload.transactionUid,
        buyerUid: payload.buyerUid,
        recipientUid: payload.recipientUid,
        amountCents: payload.amountCents,
        netMerchantAmountCents,
        canopyTaxCents,
        currency: payload.currency,
        storeUid: payload.storeUid || null,
        sourcePage: payload.sourcePage || 'canopy_store',
        description: payload.description || 'Paiement souverain 1-clic',
        now: now.toISOString()
      });

      if (!neoResult.records || neoResult.records.length === 0) {
        throw new IlotError("Échec de la synchronisation de la transaction dans la matrice Neo4j.", "INTERNAL_ERROR", 500);
      }

      return {
        success: true,
        transactionUid: payload.transactionUid,
        newBuyerBalance: buyerWallet.balance,
        newRecipientBalance: recipientWallet.balance
      };
    });

    // 🛡️ SÉCURISATION DU TISSAGE UNIVERSEL VIA L'UTILITAIRE GLOBAL
    if (payload.buyerUid !== payload.recipientUid) {
      await safeSyncUniversalInteraction(payload.buyerUid, payload.recipientUid, 'ECOMMERCE', 'executeStoreTransaction');
    }

    return result;
  }

  /**
   * 📦 MOTEUR DE TROC & DON D'OBJET VIA LE CHAPEAU
   */
  public async executeItemExchange(
    payload: ItemExchangeTransactionPayload,
    signature: ActionSignature
  ): Promise<{ success: boolean; exchangeUid: string; offeredItemUid: string }> {

    const isSender = signature.actorUid === payload.senderUid;
    const isArchitect = signature.capabilities.includes('*');

    if (!signature.actorUid || (!isSender && !isArchitect)) {
      throw new IlotError("Aura d'authentification insuffisante pour initier ce troc.", "UNAUTHORIZED", 401);
    }

    if (payload.senderUid === payload.recipientUid) {
      throw new IlotError("Un oiseau ne peut pas troquer un objet avec lui-même.", "BAD_REQUEST", 400);
    }

    const result = await TransactionManager.execute("Troc d'Objet / Création - Chapeau", async (mongoSession, neo4jTx) => {
      const now = new Date();
      
      await KomptaLedgerService.recordEntry({
        ownerUid: payload.senderUid,
        counterpartyUid: payload.recipientUid,
        amount: 0,
        amountCents: 0,
        currency: 'EUR',
        type: 'DEBIT',
        category: 'BARTER',
        referenceUid: payload.exchangeUid,
        description: `Troc de l'artefact [${payload.offeredItemUid}] contre "${payload.targetTitle}"`,
        createdAt: now,
        session: mongoSession
      });

      const cypher = `
        MATCH (sender:User {uid: $senderUid})
        MATCH (recipient:User {uid: $recipientUid})
        CREATE (exchange:ItemExchange {
          uid: $exchangeUid,
          offeredItemUid: $offeredItemUid,
          targetTitle: $targetTitle,
          description: $description,
          createdAt: datetime($now)
        })
        CREATE (sender)-[:OFFERED_CREATION]->(exchange)
        CREATE (exchange)-[:TRANSFERRED_TO]->(recipient)
        RETURN exchange.uid AS exchangeUid
      `;

      const neoResult = await neo4jTx.run(cypher, {
        exchangeUid: payload.exchangeUid,
        senderUid: payload.senderUid,
        recipientUid: payload.recipientUid,
        offeredItemUid: payload.offeredItemUid,
        targetTitle: payload.targetTitle,
        description: payload.description || 'Troc universel via le Chapeau',
        now: now.toISOString()
      });

      if (!neoResult.records || neoResult.records.length === 0) {
        throw new IlotError("Échec de l'enregistrement du troc dans la matrice Neo4j.", "INTERNAL_ERROR", 500);
      }

      return {
        success: true,
        exchangeUid: payload.exchangeUid,
        offeredItemUid: payload.offeredItemUid
      };
    });

    // 🛡️ SÉCURISATION DU TISSAGE UNIVERSEL VIA L'UTILITAIRE GLOBAL
    if (payload.senderUid !== payload.recipientUid) {
      await safeSyncUniversalInteraction(payload.senderUid, payload.recipientUid, 'ECOMMERCE', 'executeItemExchange');
    }

    return result;
  }

  /**
   * 🏦 MOTEUR D'ENTRÉE DES FONDS EXTERNES (Webhook Stripe/Trésorerie)
   */
  public async processExternalPayment(
    payload: ExternalPaymentPayload
  ): Promise<{ success: boolean; depositUid: string }> {
    
    const recipientUid = payload.metadata?.recipientUid || payload.customer;

    if (!recipientUid) {
      throw new IlotError("Impossible de déterminer l'oiseau destinataire des fonds externes.", "BAD_REQUEST", 400);
    }

    if (payload.amount <= 0 || !Number.isInteger(payload.amount)) {
      throw new IlotError("Le montant du dépôt externe en centimes doit être un entier strict et positif.", "BAD_REQUEST", 400);
    }

    return await TransactionManager.execute("Dépôt Externe (Webhook) & Kompta", async (mongoSession, neo4jTx) => {
      const now = new Date();

      let recipientWallet = await WalletModel.findOne({ userId: recipientUid }).session(mongoSession);
      
      if (!recipientWallet) {
        recipientWallet = new WalletModel({
          userId: recipientUid,
          balance: 0,
          currency: payload.currency.toUpperCase(),
          linkedAccounts: []
        });
      }

      recipientWallet.balance += payload.amount;
      recipientWallet.updatedAt = now;
      await recipientWallet.save({ session: mongoSession });

      await KomptaLedgerService.recordEntry({
        ownerUid: recipientUid,
        counterpartyUid: 'EXTERNAL_SYSTEM',
        amount: payload.amount / 100,
        amountCents: payload.amount,
        currency: payload.currency.toUpperCase() as SovereignCurrency,
        type: 'CREDIT',
        category: 'EXTERNAL_DEPOSIT',
        referenceUid: payload.id,
        description: `Dépôt externe validé via Webhook (Réf: ${payload.id})`,
        createdAt: now,
        session: mongoSession
      });

      const cypher = `
        MATCH (recipient:User {uid: $recipientUid})
        CREATE (d:FiatDeposit {
          uid: $depositUid,
          amountCents: $amountCents,
          currency: $currency,
          createdAt: datetime($now)
        })
        CREATE (d)-[:DEPOSITED_TO]->(recipient)
        RETURN d.uid AS txUid
      `;

      const neoResult = await neo4jTx.run(cypher, {
        depositUid: payload.id,
        recipientUid: recipientUid,
        amountCents: payload.amount,
        currency: payload.currency.toUpperCase(),
        now: now.toISOString()
      });

      if (!neoResult.records || neoResult.records.length === 0) {
        throw new IlotError("Échec de la consignation du dépôt externe dans le Graphe.", "INTERNAL_ERROR", 500);
      }

      return {
        success: true,
        depositUid: payload.id
      };
    });
  }
}