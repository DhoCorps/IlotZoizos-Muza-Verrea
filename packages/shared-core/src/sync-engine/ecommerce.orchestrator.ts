import { TransactionManager } from './transactionManager';
import { ActionSignature } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';
import { syncUniversalInteraction } from '@ilot/infrastructure';

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
      // ⏱️ SYNCHRONISATION DES HORODATAGES : Constante unique 'now'
      const now = new Date();

      // Utilisation d'un MATCH strict : L'utilisateur DOIT exister, on ne crée pas de fantôme avec MERGE
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
      // ⏱️ SYNCHRONISATION DES HORODATAGES : Constante unique 'now'
      const now = new Date();

      // On récupère également l'UID du vendeur (owner) via la boutique pour la synchro
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

    // 🛡️ PROBLÈME 1 : Tissage de la toile universelle en arrière-plan avec protection try/catch (Serverless safe)
    if (result.ownerUid && result.ownerUid !== data.buyerUid) {
      try {
        await syncUniversalInteraction(data.buyerUid, result.ownerUid, 'ECOMMERCE');
      } catch (err) {
        console.error(`  [Orchestrator] Échec non bloquant du tissage universel (recordOrder) :`, err);
      }
    }

    return { success: result.success, orderUid: result.orderUid };
  }

  /**
   * 🤝 PROPOSITION DE TROC
   * Enregistre une offre d'échange et crée un lien indexé dans le Graphe Neo4j.
   */
  async proposeBarter(
    data: { uid: string; initiatorUid: string; receiverUid?: string; offeredUids: string[]; requestedUids: string[] },
    signature: ActionSignature
  ) {
    if (!signature.actorUid) {
      throw new IlotError("Oiseau non authentifié pour initier un troc.", "UNAUTHORIZED", 401);
    }
    
    const result = await TransactionManager.execute("Proposition de Troc", async (_mongoSession, neo4jTx) => {
      // ⏱️ SYNCHRONISATION DES HORODATAGES : Constante unique 'now'
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

    // 🛡️ PROBLÈME 1 : S'il y a une cible précise, interaction sécurisée par try/catch
    if (data.receiverUid && data.receiverUid !== data.initiatorUid) {
      try {
        await syncUniversalInteraction(data.initiatorUid, data.receiverUid, 'ECOMMERCE');
      } catch (err) {
        console.error(`  [Orchestrator] Échec non bloquant du tissage universel (proposeBarter) :`, err);
      }
    }

    return result;
  }

  /**
   * ⚖️ ACCEPTATION / RÉSOLUTION D'UN TROC
   * Clôture l'échange et tisse la relation de troc direct entre les deux Oiseaux dans le Graphe.
   */
  async resolveBarter(
    data: { barterUid: string; acceptorUid: string; status: 'ACCEPTED' | 'REJECTED' },
    signature: ActionSignature
  ) {
    if (!signature.actorUid) {
      throw new IlotError("Oiseau non authentifié pour répondre au troc.", "UNAUTHORIZED", 401);
    }
    
    const result = await TransactionManager.execute("Résolution de Troc", async (_mongoSession, neo4jTx) => {
      // On retourne l'UID de l'initiateur pour pouvoir créer le lien universel
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

    // 🛡️ PROBLÈME 1 : Tissage de la toile universelle sécurisé par try/catch
    if (result.initiatorUid && result.initiatorUid !== data.acceptorUid) {
      try {
        await syncUniversalInteraction(result.initiatorUid, data.acceptorUid, 'ECOMMERCE');
      } catch (err) {
        console.error(`  [Orchestrator] Échec non bloquant du tissage universel (resolveBarter) :`, err);
      }
    }

    return { success: result.success, status: result.status };
  }
}