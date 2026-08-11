// packages/shared-core/src/sync-engine/komptaPayment.orchestrator.ts
import mongoose from 'mongoose';
import { TransactionManager } from './transactionManager';
import { IlotError } from '../errors/ilot.errors';
import { ActionSignature } from '@ilot/types';
import { WalletModel } from '../../../infrastructure/src/database/models/nosql/wallet.model';
import { KomptaLedgerService } from '../../../infrastructure/src/database/services/komptaLedger.services';

export interface DirectTransferPayload {
  transferUid: string;
  senderUid: string;
  recipientUid: string;
  amountCents: number;
  currency: string;
  sourcePage?: string;
  description?: string;
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
}

export interface ItemExchangeTransactionPayload {
  exchangeUid: string;
  senderUid: string;       
  recipientUid: string;    
  offeredItemUid: string;  
  targetTitle: string;     
  description?: string;
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

    if (payload.amountCents <= 0) {
      throw new IlotError("Le montant du transfert doit être supérieur à zéro.", "BAD_REQUEST", 400);
    }

    if (payload.senderUid === payload.recipientUid) {
      throw new IlotError("Un oiseau ne peut pas s'auto-transférer des fonds.", "BAD_REQUEST", 400);
    }

    return await TransactionManager.execute("Transfert Direct P2P & Kompta", async (mongoSession, neo4jTx) => {
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

      senderWallet.updatedAt = new Date();
      recipientWallet.updatedAt = new Date();

      await senderWallet.save({ session: mongoSession });
      await recipientWallet.save({ session: mongoSession });

      // 📊 KOMPTA HOOK : Écriture de Débit pour l'expéditeur
      await KomptaLedgerService.recordEntry({
        ownerUid: payload.senderUid,
        counterpartyUid: payload.recipientUid,
        amountCents: payload.amountCents,
        currency: payload.currency,
        type: 'DEBIT',
        category: 'SYSTEM_TRANSFER',
        referenceUid: payload.transferUid,
        description: payload.description || 'Transfert P2P sortant',
        session: mongoSession
      });

      // 📊 KOMPTA HOOK : Écriture de Crédit pour le destinataire
      await KomptaLedgerService.recordEntry({
        ownerUid: payload.recipientUid,
        counterpartyUid: payload.senderUid,
        amountCents: payload.amountCents,
        currency: payload.currency,
        type: 'CREDIT',
        category: 'SYSTEM_TRANSFER',
        referenceUid: payload.transferUid,
        description: payload.description || 'Transfert P2P entrant',
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
          createdAt: datetime()
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
        description: payload.description || 'Transfert direct 1-clic'
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

    if (payload.amountCents <= 0) {
      throw new IlotError("Le montant de la transaction doit être supérieur à zéro.", "BAD_REQUEST", 400);
    }

    if (payload.buyerUid === payload.recipientUid) {
      throw new IlotError("Un oiseau ne peut pas effectuer une transaction marchande avec lui-même.", "BAD_REQUEST", 400);
    }

    return await TransactionManager.execute("Transaction Marchande & Redistribution", async (mongoSession, neo4jTx) => {
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

      // 🏛️ Calcul de la Sève de redistribution (Trésor de l'Îlot)
      const canopyTaxCents = Math.floor(payload.amountCents * KomptaPaymentOrchestrator.CANOPY_TAX_RATE);
      const netMerchantAmountCents = payload.amountCents - canopyTaxCents;

      // Récupération ou initialisation du portefeuille du Trésor de l'Îlot
      let treasuryWallet = await WalletModel.findOne({ userId: KomptaPaymentOrchestrator.CANOPY_TREASURY_UID }).session(mongoSession);
      if (!treasuryWallet) {
        treasuryWallet = new WalletModel({
          userId: KomptaPaymentOrchestrator.CANOPY_TREASURY_UID,
          balance: 0,
          currency: payload.currency,
          linkedAccounts: []
        });
      }

      // Mouvements comptables Silice
      buyerWallet.balance -= payload.amountCents;
      recipientWallet.balance += netMerchantAmountCents;
      treasuryWallet.balance += canopyTaxCents;

      buyerWallet.updatedAt = new Date();
      recipientWallet.updatedAt = new Date();
      treasuryWallet.updatedAt = new Date();

      await buyerWallet.save({ session: mongoSession });
      await recipientWallet.save({ session: mongoSession });
      await treasuryWallet.save({ session: mongoSession });

      // 📊 KOMPTA HOOK : Débit total de l'acheteur
      await KomptaLedgerService.recordEntry({
        ownerUid: payload.buyerUid,
        counterpartyUid: payload.recipientUid,
        amountCents: payload.amountCents,
        currency: payload.currency,
        type: 'DEBIT',
        category: 'STORE_PURCHASE',
        referenceUid: payload.transactionUid,
        description: payload.description || 'Achat d\'artefact sur la boutique',
        session: mongoSession
      });

      // 📊 KOMPTA HOOK : Crédit net pour le vendeur
      await KomptaLedgerService.recordEntry({
        ownerUid: payload.recipientUid,
        counterpartyUid: payload.buyerUid,
        amountCents: netMerchantAmountCents,
        currency: payload.currency,
        type: 'CREDIT',
        category: 'STORE_SALE',
        referenceUid: payload.transactionUid,
        description: `Vente d'artefact (Net après taxe de redistribution)`,
        session: mongoSession
      });

      // 📊 KOMPTA HOOK : Crédit de la taxe pour le Trésor de l'Îlot
      if (canopyTaxCents > 0) {
        await KomptaLedgerService.recordEntry({
          ownerUid: KomptaPaymentOrchestrator.CANOPY_TREASURY_UID,
          counterpartyUid: payload.buyerUid,
          amountCents: canopyTaxCents,
          currency: payload.currency,
          type: 'CREDIT',
          category: 'CANOPY_TAX_REVENUE',
          referenceUid: payload.transactionUid,
          description: 'Prélèvement souverain de redistribution (1%)',
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
          createdAt: datetime()
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
        description: payload.description || 'Paiement souverain 1-clic'
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

    return await TransactionManager.execute("Troc d'Objet / Création - Chapeau", async (mongoSession, neo4jTx) => {
      
      await KomptaLedgerService.recordEntry({
        ownerUid: payload.senderUid,
        counterpartyUid: payload.recipientUid,
        amountCents: 0,
        currency: 'EUR',
        type: 'DEBIT',
        category: 'BARTER',
        referenceUid: payload.exchangeUid,
        description: `Troc de l'artefact [${payload.offeredItemUid}] contre "${payload.targetTitle}"`,
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
          createdAt: datetime()
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
        description: payload.description || 'Troc universel via le Chapeau'
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
  }
}