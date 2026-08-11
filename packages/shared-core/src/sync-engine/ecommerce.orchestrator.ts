// packages/shared-core/src/sync-engine/ecommerce.orchestrator.ts
import { TransactionManager } from './transactionManager';
import { ActionSignature } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';

export class EcommerceOrchestrator {

  /**
   * 🛒 Création d'une boutique et liaison de l'Oiseau propriétaire dans le graphe Neo4j
   */
  async createStore(
    data: { uid: string; ownerUid: string; storeName: string; slug: string; stripeAccountId?: string },
    signature: ActionSignature
  ) {
    if (!signature.actorUid) {
      throw new IlotError("Oiseau non authentifié pour créer une boutique.", "UNAUTHORIZED", 401);
    }

    return await TransactionManager.execute("Création de boutique", async (mongoSession, neo4jTx) => {
      // Utilisation d'un MATCH strict : L'utilisateur DOIT exister, on ne crée pas de fantôme avec MERGE
      const query = `
        MATCH (u:User { uid: $ownerUid })
        CREATE (s:Store { uid: $uid, storeName: $storeName, slug: $slug, createdAt: datetime() })
        CREATE (u)-[:OWNS_STORE]->(s)
        RETURN s
      `;
      
      const neoResult = await neo4jTx.run(query, { 
        ownerUid: data.ownerUid, 
        uid: data.uid, 
        storeName: data.storeName,
        slug: data.slug
      });

      if (neoResult.records.length === 0) {
        throw new IlotError("Oiseau propriétaire introuvable dans le Graphe.", "NOT_FOUND", 404);
      }

      return { success: true, storeUid: data.uid };
    });
  }

  /**
   * 💳 Enregistrement d'une commande payée et liaison de l'acheteur à la boutique
   */
  async recordOrder(
    data: { uid: string; buyerUid: string; storeUid: string; totalAmountCents: number; stripePaymentIntentId: string },
    signature: ActionSignature
  ) {
    if (!signature.actorUid) {
      throw new IlotError("Oiseau non authentifié pour passer commande.", "UNAUTHORIZED", 401);
    }

    return await TransactionManager.execute("Enregistrement de commande", async (mongoSession, neo4jTx) => {
      const query = `
        MATCH (buyer:User { uid: $buyerUid })
        MATCH (store:Store { uid: $storeUid })
        CREATE (o:Order { uid: $uid, totalAmountCents: $totalAmountCents, status: 'PAID', createdAt: datetime() })
        CREATE (buyer)-[:BOUGHT]->(o)
        CREATE (o)-[:FULFILLED_BY]->(store)
        RETURN o
      `;
      
      const neoResult = await neo4jTx.run(query, {
        buyerUid: data.buyerUid,
        storeUid: data.storeUid,
        uid: data.uid,
        totalAmountCents: data.totalAmountCents
      });

      if (neoResult.records.length === 0) {
        throw new IlotError("Acheteur ou Boutique introuvable dans le Graphe.", "NOT_FOUND", 404);
      }

      return { success: true, orderUid: data.uid };
    });
  }

  /**
   * 🔄 PROPOSITION DE TROC
   * Enregistre une offre d'échange et crée un lien indexé dans le Graphe Neo4j.
   */
  async proposeBarter(
    data: { uid: string; initiatorUid: string; receiverUid?: string; offeredUids: string[]; requestedUids: string[] },
    signature: ActionSignature
  ) {
    if (!signature.actorUid) {
      throw new IlotError("Oiseau non authentifié pour initier un troc.", "UNAUTHORIZED", 401);
    }

    return await TransactionManager.execute("Proposition de Troc", async (mongoSession, neo4jTx) => {
      const query = `
        MATCH (initiator:User { uid: $initiatorUid })
        CREATE (b:BarterOffer { uid: $uid, status: 'PENDING', createdAt: datetime() })
        CREATE (initiator)-[:PROPOSES_BARTER]->(b)
        ${data.receiverUid ? 'WITH b MATCH (receiver:User { uid: $receiverUid }) CREATE (b)-[:TARGETS_USER]->(receiver)' : ''}
        RETURN b
      `;
      
      const neoResult = await neo4jTx.run(query, {
        uid: data.uid,
        initiatorUid: signature.actorUid,
        receiverUid: data.receiverUid || null
      });

      if (neoResult.records.length === 0) {
        throw new IlotError("Initiateur du troc introuvable dans le Graphe.", "NOT_FOUND", 404);
      }

      return { success: true, barterUid: data.uid };
    });
  }

  /**
   * 🤝 ACCEPTATION / RÉSOLUTION D'UN TROC
   * Clôture l'échange et tisse la relation de troc direct entre les deux Oiseaux dans le Graphe.
   */
  async resolveBarter(
    data: { barterUid: string; acceptorUid: string; status: 'ACCEPTED' | 'REJECTED' },
    signature: ActionSignature
  ) {
    if (!signature.actorUid) {
      throw new IlotError("Oiseau non authentifié pour répondre au troc.", "UNAUTHORIZED", 401);
    }

    return await TransactionManager.execute("Résolution de Troc", async (mongoSession, neo4jTx) => {
      const query = `
        MATCH (b:BarterOffer { uid: $barterUid })<-[:PROPOSES_BARTER]-(initiator:User)
        MATCH (acceptor:User { uid: $acceptorUid })
        SET b.status = $status
        ${data.status === 'ACCEPTED' ? 'CREATE (initiator)-[:TRADED_WITH]->(acceptor)' : ''}
        RETURN b
      `;
      
      const neoResult = await neo4jTx.run(query, {
        barterUid: data.barterUid,
        acceptorUid: signature.actorUid,
        status: data.status
      });

      if (neoResult.records.length === 0) {
        throw new IlotError("Offre de troc ou Oiseau cible introuvable dans le Graphe.", "NOT_FOUND", 404);
      }

      return { success: true, status: data.status };
    });
  }
}