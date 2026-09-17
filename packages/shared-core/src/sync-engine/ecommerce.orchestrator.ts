import { TransactionManager } from './transactionManager';
import { ActionSignature } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';
import { safeSyncUniversalInteraction } from '@ilot/shared-core';
import { ProductModel, StoreModel } from '@ilot/infrastructure';

export interface EcommerceSyncResult {
  success: boolean;
  storeUid?: string;
  orderUid?: string;
  barterUid?: string;
  status?: string;
}

export interface CreateStorePayload {
  uid: string;
  ownerUid: string;
  storeName: string;
  slug: string;
  stripeAccountId?: string;
  [key: string]: unknown;
}

export interface RecordOrderPayload {
  uid: string;
  buyerUid: string;
  storeUid: string;
  totalAmountCents: number;
  stripePaymentIntentId: string;
  [key: string]: unknown;
}

export interface ProposeBarterPayload {
  uid: string;
  initiatorUid: string;
  receiverUid?: string;
  offeredUids: string[];
  requestedUids: string[];
  [key: string]: unknown;
}

export interface ResolveBarterPayload {
  barterUid: string;
  acceptorUid: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED';
  [key: string]: unknown;
}

export class EcommerceOrchestrator {
  /**
   * Création d'une boutique et liaison de l'Oiseau propriétaire dans le graphe Neo4j
   */
  async createStore(
    data: CreateStorePayload,
    signature: ActionSignature
  ): Promise<EcommerceSyncResult> {
    if (!signature.actorUid) {
      throw new IlotError("Oiseau non authentifié pour créer une boutique.", "UNAUTHORIZED", 401);
    }

    return await TransactionManager.execute("Création de boutique", async (_mongoSession, neo4jTx) => {
      const now = new Date();

      const query = `
        MATCH (u:User { uid: $ownerUid })
        CREATE (s:Store { uid: $uid, storeName: $storeName, slug: $slug, createdAt: datetime($now) })
        CREATE (u)-[:OWNS_STORE]->(s)
        RETURN s
      `;
      
      const neoResult = await neo4jTx.run(query, {
        ownerUid: data.ownerUid,
        uid: data.uid,
        storeName: data.storeName,
        slug: data.slug,
        now: now.toISOString()
      });

      if (neoResult.records.length === 0) {
        throw new IlotError("Oiseau propriétaire introuvable dans le Graphe.", "NOT_FOUND", 404);
      }
      return { success: true, storeUid: data.uid };
    });
  }

  /**
   * 🛍️ Enregistrement d'une commande payée et liaison de l'acheteur à la boutique
   */
  async recordOrder(
    data: RecordOrderPayload,
    signature: ActionSignature
  ): Promise<EcommerceSyncResult> {
    if (!signature.actorUid) {
      throw new IlotError("Oiseau non authentifié pour passer commande.", "UNAUTHORIZED", 401);
    }

    const result = await TransactionManager.execute("Enregistrement de commande", async (_mongoSession, neo4jTx) => {
      const now = new Date();

      const query = `
        MATCH (buyer:User { uid: $buyerUid })
        MATCH (store:Store { uid: $storeUid })<-[:OWNS_STORE]-(owner:User)
        CREATE (o:Order { uid: $uid, totalAmountCents: $totalAmountCents, status: 'PAID', createdAt: datetime($now) })
        CREATE (buyer)-[:BOUGHT]->(o)
        CREATE (o)-[:FULFILLED_BY]->(store)
        RETURN o, owner.uid AS ownerUid
      `;
      
      const neoResult = await neo4jTx.run(query, {
        buyerUid: data.buyerUid,
        storeUid: data.storeUid,
        uid: data.uid,
        totalAmountCents: data.totalAmountCents,
        now: now.toISOString()
      });

      if (neoResult.records.length === 0) {
        throw new IlotError("Acheteur ou Boutique introuvable dans le Graphe.", "NOT_FOUND", 404);
      }

      const ownerUid = neoResult.records[0].get('ownerUid') as string;

      return { success: true, orderUid: data.uid, ownerUid };
    });

    // 🛡️ SÉCURISATION DU TISSAGE UNIVERSEL VIA LA DLQ CENTRALISÉE
    if (result.ownerUid && result.ownerUid !== data.buyerUid) {
      await safeSyncUniversalInteraction(data.buyerUid, result.ownerUid, 'ECOMMERCE', 'recordOrder');
    }

    return { success: result.success, orderUid: result.orderUid };
  }

  /**
   * 🤝 PROPOSITION DE TROC
   */
  async proposeBarter(
    data: ProposeBarterPayload,
    signature: ActionSignature
  ): Promise<EcommerceSyncResult> {
    if (!signature.actorUid) {
      throw new IlotError("Oiseau non authentifié pour initier un troc.", "UNAUTHORIZED", 401);
    }
    
    const result = await TransactionManager.execute("Proposition de Troc", async (_mongoSession, neo4jTx) => {
      const now = new Date();

      const query = `
        MATCH (initiator:User { uid: $initiatorUid })
        CREATE (b:BarterOffer { uid: $uid, status: 'PENDING', createdAt: datetime($now) })
        CREATE (initiator)-[:PROPOSES_BARTER]->(b)
        ${data.receiverUid ? 'WITH b MATCH (receiver:User { uid: $receiverUid }) CREATE (b)-[:TARGETS_USER]->(receiver)' : ''}
        RETURN b
      `;
      
      const neoResult = await neo4jTx.run(query, {
        uid: data.uid,
        initiatorUid: signature.actorUid,
        receiverUid: data.receiverUid || null,
        now: now.toISOString()
      });

      if (neoResult.records.length === 0) {
        throw new IlotError("Initiateur du troc introuvable dans le Graphe.", "NOT_FOUND", 404);
      }
      return { success: true, barterUid: data.uid };
    });

    // 🛡️ SÉCURISATION DU TISSAGE UNIVERSEL VIA LA DLQ CENTRALISÉE
    if (data.receiverUid && data.receiverUid !== data.initiatorUid) {
      await safeSyncUniversalInteraction(data.initiatorUid, data.receiverUid, 'ECOMMERCE', 'proposeBarter');
    }

    return result;
  }

  /**
   * ⚖️ ACCEPTATION / RÉSOLUTION D'UN TROC
   */
  async resolveBarter(
    data: ResolveBarterPayload,
    signature: ActionSignature
  ): Promise<EcommerceSyncResult> {
    if (!signature.actorUid) {
      throw new IlotError("Oiseau non authentifié pour répondre au troc.", "UNAUTHORIZED", 401);
    }
    
    const result = await TransactionManager.execute("Résolution de Troc", async (_mongoSession, neo4jTx) => {
      const query = `
        MATCH (b:BarterOffer { uid: $barterUid })<-[:PROPOSES_BARTER]-(initiator:User)
        MATCH (acceptor:User { uid: $acceptorUid })
        SET b.status = $status
        ${data.status === 'ACCEPTED' ? 'CREATE (initiator)-[:TRADED_WITH]->(acceptor)' : ''}
        RETURN b, initiator.uid AS initiatorUid
      `;
      
      const neoResult = await neo4jTx.run(query, {
        barterUid: data.barterUid,
        acceptorUid: signature.actorUid,
        status: data.status
      });

      if (neoResult.records.length === 0) {
        throw new IlotError("Offre de troc ou Oiseau cible introuvable dans le Graphe.", "NOT_FOUND", 404);
      }

      const initiatorUid = neoResult.records[0].get('initiatorUid') as string;

      return { success: true, status: data.status, initiatorUid };
    });

    // 🛡️ SÉCURISATION DU TISSAGE UNIVERSEL VIA LA DLQ CENTRALISÉE
    if (result.initiatorUid && result.initiatorUid !== data.acceptorUid) {
      await safeSyncUniversalInteraction(result.initiatorUid, data.acceptorUid, 'ECOMMERCE', 'resolveBarter');
    }

    return { success: result.success, status: result.status };
  }

  /**
   * 🗑️ SUPPRESSION / DISSOLUTION D'UN ARTEFACT (PRODUIT)
   */
  async removeProduct(
    productUid: string,
    signature: ActionSignature
  ): Promise<EcommerceSyncResult> {
    if (!signature.actorUid) {
      throw new IlotError("Oiseau non authentifié pour supprimer cet artefact.", "UNAUTHORIZED", 401);
    }

    await TransactionManager.execute("Suppression d'artefact", async (_mongoSession, neo4jTx) => {
      const query = `
        MATCH (p:Product { uid: $productUid })
        DETACH DELETE p
      `;
      await neo4jTx.run(query, { productUid });
    });

    await ProductModel.deleteOne({ uid: productUid });

    return { success: true };
  }

  /**
   * 🏛️ DISSOLUTION / FERMETURE D'UNE BOUTIQUE
   */
  async dissolveStore(
    storeUid: string,
    signature: ActionSignature
  ): Promise<EcommerceSyncResult> {
    if (!signature.actorUid) {
      throw new IlotError("Oiseau non authentifié pour dissoudre cette boutique.", "UNAUTHORIZED", 401);
    }

    await TransactionManager.execute("Dissolution de boutique", async (_mongoSession, neo4jTx) => {
      const query = `
        MATCH (s:Store { uid: $storeUid })
        DETACH DELETE s
      `;
      await neo4jTx.run(query, { storeUid });
    });

    await StoreModel.deleteOne({ uid: storeUid });

    return { success: true };
  }
}