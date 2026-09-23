import { TransactionManager } from './transactionManager';
import { ActionSignature } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';
import { safeSyncUniversalInteraction } from '@ilot/shared-core';
import { ProductModel, StoreModel, RouletteModel } from '@ilot/infrastructure';
import crypto from 'crypto';

export interface EcommerceSyncResult {
  success: boolean;
  storeUid?: string;
  orderUid?: string;
  barterUid?: string;
  productUid?: string;
  sessionUid?: string;
  status?: string;
  price?: number;
  data?: any;
}

export interface CreateStorePayload {
  uid: string;
  ownerUid: string;
  storeName: string;
  slug: string;
  stripeAccountId?: string;
  [key: string]: unknown;
}

export interface CreateProductPayload {
  uid: string;
  storeUid: string;
  title: string;
  priceCents: number;
  tags?: string[];
  isRouletteActive?: boolean;
  wagerAmount?: number;
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
  // ==========================================
  // 🏪 GESTION DES BOUTIQUES
  // ==========================================
  
  async createStore(data: CreateStorePayload, signature: ActionSignature): Promise<EcommerceSyncResult> {
    if (!signature.actorUid) throw new IlotError("Oiseau non authentifié", "UNAUTHORIZED", 401);

    return await TransactionManager.execute("Création de boutique", async (_mongoSession, neo4jTx) => {
      const now = new Date();
      const query = `
        MATCH (u:User { uid: $ownerUid })
        CREATE (s:Store { uid: $uid, storeName: $storeName, slug: $slug, createdAt: datetime($now) })
        CREATE (u)-[:OWNS_STORE]->(s)
        RETURN s
      `;
      const neoResult = await neo4jTx.run(query, { ...data, now: now.toISOString() });

      if (neoResult.records.length === 0) throw new IlotError("Propriétaire introuvable", "NOT_FOUND", 404);
      return { success: true, storeUid: data.uid };
    });
  }

  async dissolveStore(storeUid: string, signature: ActionSignature): Promise<EcommerceSyncResult> {
    if (!signature.actorUid) throw new IlotError("Oiseau non authentifié", "UNAUTHORIZED", 401);

    await TransactionManager.execute("Dissolution de boutique", async (_mongoSession, neo4jTx) => {
      await neo4jTx.run(`MATCH (s:Store { uid: $storeUid }) DETACH DELETE s`, { storeUid });
    });
    await StoreModel.deleteOne({ uid: storeUid });
    return { success: true };
  }

  // ==========================================
  // 📦 GESTION DES ARTEFACTS (PRODUITS & TAGS)
  // ==========================================

  async createProduct(data: CreateProductPayload, signature: ActionSignature): Promise<EcommerceSyncResult> {
    if (!signature.actorUid) throw new IlotError("Oiseau non authentifié", "UNAUTHORIZED", 401);

    return await TransactionManager.execute("Création Produit", async (_mongoSession, neo4jTx) => {
      const query = `
        MATCH (s:Store {uid: $storeUid})
        CREATE (p:Product { 
          uid: $uid, 
          title: $title, 
          priceCents: $priceCents,
          tags: $tags,
          isRouletteActive: $isRouletteActive,
          wagerAmount: $wagerAmount,
          createdAt: datetime() 
        })
        CREATE (s)-[:SELLS]->(p)
        RETURN p
      `;
      await neo4jTx.run(query, {
        uid: data.uid,
        storeUid: data.storeUid,
        title: data.title,
        priceCents: data.priceCents,
        tags: data.tags || [],
        isRouletteActive: data.isRouletteActive || false,
        wagerAmount: data.wagerAmount || 0
      });

      return { success: true, productUid: data.uid };
    });
  }

  async removeProduct(productUid: string, signature: ActionSignature): Promise<EcommerceSyncResult> {
    if (!signature.actorUid) throw new IlotError("Oiseau non authentifié", "UNAUTHORIZED", 401);
    await TransactionManager.execute("Suppression d'artefact", async (_mongoSession, neo4jTx) => {
      await neo4jTx.run(`MATCH (p:Product { uid: $productUid }) DETACH DELETE p`, { productUid });
    });
    await ProductModel.deleteOne({ uid: productUid });
    return { success: true };
  }

  async getMarketplaceProducts(tags: string[] = []): Promise<EcommerceSyncResult> {
    return await TransactionManager.execute("Recherche Produits", async (_mongoSession, neo4jTx) => {
      const query = `
        MATCH (p:Product)<-[:SELLS]-(s:Store)
        ${tags.length > 0 ? 'WHERE any(tag IN $tags WHERE tag IN p.tags)' : ''}
        RETURN p.uid AS uid, p.title AS title, p.priceCents AS priceCents, p.tags AS tags, s.uid AS storeUid
        LIMIT 50
      `;
      const result = await neo4jTx.run(query, { tags });
      const products = result.records.map(r => ({
        uid: r.get('uid'),
        title: r.get('title'),
        priceCents: r.get('priceCents'),
        tags: r.get('tags'),
        storeUid: r.get('storeUid')
      }));
      return { success: true, data: products };
    });
  }

  // ==========================================
  // 🎡 LA ROULETTE KARMIQUE & PRIX DYNAMIQUE
  // ==========================================

  async calculateKarmicPrice(buyerUid: string, sellerUid: string, basePriceShards: number): Promise<number> {
    return await TransactionManager.execute("Calcul Karma", async (_mongoSession, neo4jTx) => {
      const query = `
        MATCH path = shortestPath((b:User {uid: $buyerUid})-[:TRADED_WITH|INTERACTED*..4]-(s:User {uid: $sellerUid}))
        RETURN length(path) AS distance
      `;
      const result = await neo4jTx.run(query, { buyerUid, sellerUid });
      if (result.records.length === 0) return basePriceShards;

      const distance = result.records[0].get('distance') as number;
      let discountMultiplier = 1;
      if (distance === 1) discountMultiplier = 0.8;
      else if (distance === 2) discountMultiplier = 0.9;
      else if (distance === 3) discountMultiplier = 0.95;

      return Math.max(0, Math.floor(basePriceShards * discountMultiplier));
    }) as unknown as number;
  }

  async spinKarmicRoulette(buyerUid: string, productUid: string, signature: ActionSignature): Promise<EcommerceSyncResult> {
    if (!signature.actorUid || signature.actorUid !== buyerUid) throw new IlotError("Non autorisé", "UNAUTHORIZED", 401);

    const activeSession = await RouletteModel.findOne({ buyerUid, productUid, status: 'PENDING' });
    if (activeSession) throw new IlotError("Vous avez déjà une session en cours pour cet artefact. Revenez demain.", "FORBIDDEN", 403);

    return await TransactionManager.execute("Tirage Roulette", async (mongoSession, neo4jTx) => {
      const query = `
        MATCH (buyer:User {uid: $buyerUid})
        MATCH (p:Product {uid: $productUid})<-[:SELLS]-(:Store)<-[:OWNS_STORE]-(seller:User)
        OPTIONAL MATCH path = shortestPath((buyer)-[:TRADED_WITH*..3]-(seller))
        RETURN buyer.shardsBalance AS balance, length(path) AS distance, p.wagerAmount AS wagerAmount, p.priceCents AS basePrice
      `;
      const neoResult = await neo4jTx.run(query, { buyerUid, productUid });
      
      if (neoResult.records.length === 0) throw new IlotError("Données introuvables", "NOT_FOUND", 404);
      
      const record = neoResult.records[0];
      const balance = record.get('balance') as number || 0;
      const wagerAmount = record.get('wagerAmount') as number;
      const basePrice = record.get('basePrice') as number;
      const distance = record.get('distance') as number | null;

      if (balance < wagerAmount) throw new IlotError("Fonds karmiques insuffisants", "PAYMENT_REQUIRED", 402);
      await neo4jTx.run(`MATCH (u:User {uid: $buyerUid}) SET u.shardsBalance = u.shardsBalance - $wagerAmount`, { buyerUid, wagerAmount });

      const luckFactor = distance ? Math.max(1, 4 - distance) : 1; 
      const maxDiscountPercent = 30 * luckFactor; 
      const randomDiscount = crypto.randomInt(10, maxDiscountPercent + 1);
      const secretPrice = Math.floor(basePrice * (1 - (randomDiscount / 100)));

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const insertedSessions = await RouletteModel.insertMany([{
        buyerUid,
        productUid,
        rolledPriceCents: secretPrice,
        wagerAmount,
        status: 'PENDING',
        expiresAt
      }], { session: mongoSession });

      return { success: true, sessionUid: insertedSessions[0].uid, price: secretPrice };
    });
  }

  async resolveAbandonedRoulette(sessionUid: string): Promise<EcommerceSyncResult> {
    return await TransactionManager.execute("Résolution Abandon Roulette", async (mongoSession, neo4jTx) => {
      const session = await RouletteModel.findOne({ uid: sessionUid }).session(mongoSession);
      if (!session || session.status !== 'PENDING') throw new IlotError("Session invalide ou déjà traitée", "BAD_REQUEST", 400);

      if (new Date() < session.expiresAt) throw new IlotError("La session n'a pas encore expiré", "FORBIDDEN", 403);

      session.status = 'ABANDONED';
      await session.save({ session: mongoSession });

      if (session.wagerAmount > 0) {
        const sellerShare = Math.floor(session.wagerAmount / 2);
        const query = `
          MATCH (p:Product {uid: $productUid})<-[:SELLS]-(:Store)<-[:OWNS_STORE]-(seller:User)
          SET seller.shardsBalance = COALESCE(seller.shardsBalance, 0) + $sellerShare
        `;
        await neo4jTx.run(query, { productUid: session.productUid, sellerShare });
      }

      return { success: true, sessionUid };
    });
  }

  // ==========================================
  // 🛒 COMMANDES ET TROC
  // ==========================================
  
  async recordOrder(data: RecordOrderPayload, signature: ActionSignature): Promise<EcommerceSyncResult> {
    if (!signature.actorUid) throw new IlotError("Oiseau non authentifié", "UNAUTHORIZED", 401);

    const result = await TransactionManager.execute("Enregistrement de commande", async (_mongoSession, neo4jTx) => {
      const query = `
        MATCH (buyer:User { uid: $buyerUid })
        MATCH (store:Store { uid: $storeUid })<-[:OWNS_STORE]-(owner:User)
        CREATE (o:Order { uid: $uid, totalAmountCents: $totalAmountCents, status: 'PAID', createdAt: datetime() })
        CREATE (buyer)-[:BOUGHT]->(o)
        CREATE (o)-[:FULFILLED_BY]->(store)
        RETURN o, owner.uid AS ownerUid
      `;
      const neoResult = await neo4jTx.run(query, { ...data });
      if (neoResult.records.length === 0) throw new IlotError("Acheteur/Boutique introuvable", "NOT_FOUND", 404);
      return { success: true, orderUid: data.uid, ownerUid: neoResult.records[0].get('ownerUid') };
    });

    if (result.ownerUid && result.ownerUid !== data.buyerUid) {
      await safeSyncUniversalInteraction(data.buyerUid, result.ownerUid as string, 'ECOMMERCE', 'recordOrder');
    }
    return { success: result.success, orderUid: result.orderUid };
  }

  async proposeBarter(data: ProposeBarterPayload, signature: ActionSignature): Promise<EcommerceSyncResult> {
    if (!signature.actorUid || signature.actorUid !== data.initiatorUid) throw new IlotError("Oiseau non authentifié", "UNAUTHORIZED", 401);

    return await TransactionManager.execute("Proposition de Troc", async (_mongoSession, neo4jTx) => {
      const query = `
        MATCH (initiator:User {uid: $initiatorUid})
        CREATE (b:Barter { uid: $uid, status: 'PENDING', createdAt: datetime() })
        CREATE (initiator)-[:INITIATED]->(b)
        WITH b
        UNWIND $offeredUids AS offeredUid
        MATCH (po:Product {uid: offeredUid})
        CREATE (b)-[:OFFERS]->(po)
        WITH b
        UNWIND $requestedUids AS requestedUid
        MATCH (pr:Product {uid: requestedUid})
        CREATE (b)-[:REQUESTS]->(pr)
        RETURN b.uid AS barterUid
      `;
      await neo4jTx.run(query, {
        uid: data.uid,
        initiatorUid: data.initiatorUid,
        offeredUids: data.offeredUids,
        requestedUids: data.requestedUids
      });
      return { success: true, barterUid: data.uid };
    });
  }

  async resolveBarter(data: ResolveBarterPayload, signature: ActionSignature): Promise<EcommerceSyncResult> {
    if (!signature.actorUid) throw new IlotError("Oiseau non authentifié", "UNAUTHORIZED", 401);

    return await TransactionManager.execute("Résolution de Troc", async (_mongoSession, neo4jTx) => {
      const query = `
        MATCH (b:Barter {uid: $barterUid})
        SET b.status = $status
        WITH b
        MATCH (acceptor:User {uid: $acceptorUid})
        MERGE (acceptor)-[:RESOLVED {status: $status}]->(b)
        RETURN b.uid AS barterUid
      `;
      await neo4jTx.run(query, {
        barterUid: data.barterUid,
        acceptorUid: data.acceptorUid,
        status: data.status
      });
      return { success: true, barterUid: data.barterUid };
    });
  }
}