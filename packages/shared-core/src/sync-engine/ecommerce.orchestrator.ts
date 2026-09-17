import { TransactionManager } from './transactionManager';
import { ActionSignature } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';
import { syncUniversalInteraction, SystemGraphDlqModel } from '@ilot/infrastructure';

export class EcommerceOrchestrator {
  /**
   * Création d'une boutique et liaison de l'Oiseau propriétaire dans le graphe Neo4j
   */
  async createStore(
    data: { uid: string; ownerUid: string; storeName: string; slug: string; stripeAccountId?: string },
    signature: ActionSignature
  ) {
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
    data: { uid: string; buyerUid: string; storeUid: string; totalAmountCents: number; stripePaymentIntentId: string },
    signature: ActionSignature
  ) {
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

      const ownerUid = neoResult.records[0].get('ownerUid');

      return { success: true, orderUid: data.uid, ownerUid };
    });

    // 🛡️ SÉCURISATION DU TISSAGE UNIVERSEL : Fallback DLQ en cas de panne Neo4j
    if (result.ownerUid && result.ownerUid !== data.buyerUid) {
      try {
        await syncUniversalInteraction(data.buyerUid, result.ownerUid, 'ECOMMERCE');
      } catch (err: any) {
        console.error(`  [Orchestrator] Échec du tissage universel (recordOrder), basculement DLQ :`, err);
        try {
          await SystemGraphDlqModel.create({
            operationName: 'syncUniversalInteraction_recordOrder',
            payload: { sourceUid: data.buyerUid, targetUid: result.ownerUid, type: 'ECOMMERCE' },
            error: err.message,
            status: 'PENDING_RETRY',
            retryCount: 0,
            timestamp: new Date()
          });
        } catch (dlqErr) {
          console.error("🔥 [DLQ Fatal] Impossible d'écrire dans la file de rattrapage :", dlqErr);
        }
      }
    }

    return { success: result.success, orderUid: result.orderUid };
  }

  /**
   * 🤝 PROPOSITION DE TROC
   */
  async proposeBarter(
    data: { uid: string; initiatorUid: string; receiverUid?: string; offeredUids: string[]; requestedUids: string[] },
    signature: ActionSignature
  ) {
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

    if (data.receiverUid && data.receiverUid !== data.initiatorUid) {
      try {
        await syncUniversalInteraction(data.initiatorUid, data.receiverUid, 'ECOMMERCE');
      } catch (err: any) {
        console.error(`  [Orchestrator] Échec du tissage universel (proposeBarter), basculement DLQ :`, err);
        try {
          await SystemGraphDlqModel.create({
            operationName: 'syncUniversalInteraction_proposeBarter',
            payload: { sourceUid: data.initiatorUid, targetUid: data.receiverUid, type: 'ECOMMERCE' },
            error: err.message,
            status: 'PENDING_RETRY',
            retryCount: 0,
            timestamp: new Date()
          });
        } catch (dlqErr) {
          console.error("🔥 [DLQ Fatal] Impossible d'écrire dans la file de rattrapage :", dlqErr);
        }
      }
    }

    return result;
  }

  /**
   * ⚖️ ACCEPTATION / RÉSOLUTION D'UN TROC
   */
  async resolveBarter(
    data: { barterUid: string; acceptorUid: string; status: 'ACCEPTED' | 'REJECTED' },
    signature: ActionSignature
  ) {
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

      const initiatorUid = neoResult.records[0].get('initiatorUid');

      return { success: true, status: data.status, initiatorUid };
    });

    if (result.initiatorUid && result.initiatorUid !== data.acceptorUid) {
      try {
        await syncUniversalInteraction(result.initiatorUid, data.acceptorUid, 'ECOMMERCE');
      } catch (err: any) {
        console.error(`  [Orchestrator] Échec du tissage universel (resolveBarter), basculement DLQ :`, err);
        try {
          await SystemGraphDlqModel.create({
            operationName: 'syncUniversalInteraction_resolveBarter',
            payload: { sourceUid: result.initiatorUid, targetUid: data.acceptorUid, type: 'ECOMMERCE' },
            error: err.message,
            status: 'PENDING_RETRY',
            retryCount: 0,
            timestamp: new Date()
          });
        } catch (dlqErr) {
          console.error("🔥 [DLQ Fatal] Impossible d'écrire dans la file de rattrapage :", dlqErr);
        }
      }
    }

    return { success: result.success, status: result.status };
  }
}