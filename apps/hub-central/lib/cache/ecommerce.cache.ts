import { unstable_cache } from 'next/cache';
import mongoose from 'mongoose';
import { 
  WishlistModel, 
  StoreModel, 
  ProductModel, 
  OrderModel, 
  BarterOfferModel, 
  getNeo4jSession 
} from '@ilot/infrastructure';
import { EcommerceOrchestrator } from '@ilot/shared-core';
import { v4 as uuidv4 } from 'uuid';
import type { Record as Neo4jRecord } from 'neo4j-driver';

interface MarketplaceProduct {
  uid: string;
  title: string;
  priceCents: number;
  tags?: string[];
  category?: string;
  style?: string;
  authorSlug?: string | null;
  ownerUid?: string | null;
  storeOwnerUid?: string | null;
  [key: string]: unknown;
}

interface MatchmakerResultItem {
  matchUid: string;
  matchPseudo: string;
  itemsTheyHaveThatYouWant: string[];
  itemsYouHaveThatTheyWant: string[];
}

// -------------------------------------------------------------------------
// 1. WISHLISTS
// -------------------------------------------------------------------------
export async function getCachedUserWishlists(userUid: string) {
  const fetcher = async () => {
    if (!userUid) throw new Error("Identifiant d'oiseau requis pour les wishlists.");
    let wishlists = await WishlistModel.find({ userUid }).lean();
    if (!wishlists || wishlists.length === 0) {
      const defaultWishlist = await WishlistModel.create({
        uid: `wish_${uuidv4()}`,
        userUid,
        name: 'Favoris Principaux',
        productUids: []
      });
      const obj = typeof defaultWishlist.toObject === 'function' ? defaultWishlist.toObject() : defaultWishlist;
      wishlists = [obj];
    }
    return wishlists;
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  return await unstable_cache(
    fetcher,
    [`wishlists-user-${userUid}`],
    { revalidate: 30, tags: ['wishlists', `user-wishlists-${userUid}`] }
  )();
}

// -------------------------------------------------------------------------
// 2. STORES (Boutiques)
// -------------------------------------------------------------------------
export async function getCachedVerifiedStores() {
  const fetcher = async () => {
    return await StoreModel.find({ isVerified: true }).sort({ createdAt: -1 }).lean();
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  return await unstable_cache(
    fetcher,
    ['verified-stores-cache'],
    { revalidate: 30, tags: ['stores', 'verified-stores'] }
  )();
}

export async function getCachedStore(slug: string) {
  const fetcher = async () => {
    return await StoreModel.findOne({
      $or: [{ slug: slug }, { uid: slug }]
    }).lean();
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  return await unstable_cache(
    fetcher,
    [`store-${slug}`],
    { revalidate: 30, tags: ['stores', `store-${slug}`] }
  )();
}

// -------------------------------------------------------------------------
// 3. PRODUCTS (Artefacts)
// -------------------------------------------------------------------------
export async function getCachedProducts(storeUid?: string | null, category?: string | null) {
  const fetcher = async () => {
    const query: Record<string, unknown> = {};
    if (storeUid) query.storeUid = storeUid;
    if (category) query.category = category;
    return await ProductModel.find(query).sort({ createdAt: -1 }).lean();
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  const cacheKey = `products-${storeUid || 'all'}-${category || 'all'}`;
  return await unstable_cache(
    fetcher,
    [cacheKey],
    {
      revalidate: 30,
      tags: ['products', ...(storeUid ? [`store-products-${storeUid}`] : []), ...(category ? [`category-${category}`] : [])]
    }
  )();
}

export async function getCachedProduct(slug: string) {
  const fetcher = async () => {
    return await ProductModel.findOne({
      $or: [{ slug: slug }, { uid: slug }]
    }).lean();
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  return await unstable_cache(
    fetcher,
    [`product-${slug}`],
    { revalidate: 30, tags: ['products', `product-${slug}`] }
  )();
}

// -------------------------------------------------------------------------
// 4. ORDERS (Commandes)
// -------------------------------------------------------------------------
export async function getCachedOrder(slug: string) {
  const fetcher = async () => {
    const queryId = mongoose.isValidObjectId(slug) ? slug : null;
    return await OrderModel.findOne({
      $or: [{ uid: slug }, { _id: queryId }]
    }).lean();
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  return await unstable_cache(
    fetcher,
    [`order-${slug}`],
    { revalidate: 30, tags: ['orders', `order-${slug}`] }
  )();
}

// -------------------------------------------------------------------------
// 5. MARKETPLACE (Mise à jour avec l'Orchestrateur et Neo4j)
// -------------------------------------------------------------------------
export async function getCachedMarketplaceProducts(category?: string | null, style?: string | null, author?: string | null, tags: string[] = []) {
  const fetcher = async () => {
    const orchestrator = new EcommerceOrchestrator();
    const result = await orchestrator.getMarketplaceProducts(tags);
    
    let products: MarketplaceProduct[] = (result.data || []) as MarketplaceProduct[];

    if (category && category !== 'ALL') {
      products = products.filter((p) => p.category === category);
    }
    if (style && style !== 'ALL') {
      const regex = new RegExp(style, 'i');
      products = products.filter((p) => regex.test(String(p.style || '')) || (Array.isArray(p.tags) && p.tags.some((t) => typeof t === 'string' && regex.test(t))));
    }
    if (author && author !== 'ALL') {
      const regex = new RegExp(author, 'i');
      products = products.filter((p) => regex.test(String(p.authorSlug || p.ownerUid || p.storeOwnerUid || '')));
    }

    return products.map((product) => ({
      ...product,
      authorSlug: product.authorSlug || product.ownerUid || product.storeOwnerUid || null
    }));
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  const tagsKey = tags.length > 0 ? tags.sort().join('-') : 'no-tags';
  const cacheKey = `marketplace-${category || 'all'}-${style || 'all'}-${author || 'all'}-${tagsKey}`;
  return await unstable_cache(
    fetcher,
    [cacheKey],
    {
      revalidate: 30,
      tags: [
        'marketplace',
        ...(category && category !== 'ALL' ? [`marketplace-category-${category}`] : [])
      ]
    }
  )();
}

// -------------------------------------------------------------------------
// 6. BARTER (Troc) & MATCHMAKER
// -------------------------------------------------------------------------
export async function getCachedPendingBarters() {
  const fetcher = async () => {
    return await BarterOfferModel.find({ status: 'PENDING' }).sort({ createdAt: -1 }).lean();
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  return await unstable_cache(
    fetcher,
    ['pending-barter-offers'],
    { revalidate: 30, tags: ['barter-offers', 'pending-barters'] }
  )();
}

export async function getCachedBarterOffer(slug: string) {
  const fetcher = async () => {
    return await BarterOfferModel.findOne({ uid: slug }).lean();
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  return await unstable_cache(
    fetcher,
    [`barter-${slug}`],
    { revalidate: 30, tags: ['barter-offers', `barter-${slug}`] }
  )();
}

export async function getCachedMatchmakerResults(userUid: string): Promise<MatchmakerResultItem[]> {
  const fetcher = async (): Promise<MatchmakerResultItem[]> => {
    const sessionNeo4j = getNeo4jSession();
    try {
      const query = `
        MATCH (u:Oiseau {uid: $userUid})
        MATCH (other:Oiseau) WHERE other.uid <> $userUid
        OPTIONAL MATCH (u)-[:WANTS]->(p:Product)<-[:OWNS]-(other)
        OPTIONAL MATCH (other)-[:WANTS]->(p2:Product)<-[:OWNS]-(u)
        RETURN other.uid AS matchUid,
               other.matchPseudo AS matchPseudo,
               collect(DISTINCT p.uid) AS itemsTheyHaveThatYouWant,
               collect(DISTINCT p2.uid) AS itemsYouHaveThatTheyWant
        LIMIT 5
      `;
      const result = await sessionNeo4j.run(query, { userUid });
      return result.records.map((record: Neo4jRecord): MatchmakerResultItem => {
        const rawThey = (record.get('itemsTheyHaveThatYouWant') || []) as unknown[];
        const rawYou = (record.get('itemsYouHaveThatTheyWant') || []) as unknown[];

        return {
          matchUid: String(record.get('matchUid') || ''),
          matchPseudo: String(record.get('matchPseudo') || 'Oiseau Inconnu'),
          itemsTheyHaveThatYouWant: rawThey.filter((item): item is string => typeof item === 'string'),
          itemsYouHaveThatTheyWant: rawYou.filter((item): item is string => typeof item === 'string')
        };
      }).filter((m: MatchmakerResultItem) => m.itemsTheyHaveThatYouWant.length > 0 || m.itemsYouHaveThatTheyWant.length > 0);
    } finally {
      if (sessionNeo4j) {
        await sessionNeo4j.close().catch((err: unknown) => console.error("  [NEO4J CLOSE ERROR]", err));
      }
    }
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  const cacheKey = `matchmaker-user-${userUid}`;
  return await unstable_cache(
    fetcher,
    [cacheKey],
    { revalidate: 30, tags: ['matchmaker', `matchmaker-${userUid}`] }
  )();
}