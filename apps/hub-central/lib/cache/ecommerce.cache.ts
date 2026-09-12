// Fichier : lib/cache/ecommerce.cache.ts
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
import { v4 as uuidv4 } from 'uuid';

// -------------------------------------------------------------------------
// 1. WISHLISTS
// -------------------------------------------------------------------------
export async function getCachedUserWishlists(userUid: string) {
  const fetcher = async () => {
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
    const query: any = {};
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
// 5. MARKETPLACE
// -------------------------------------------------------------------------
export async function getCachedMarketplaceProducts(category?: string | null, style?: string | null, author?: string | null) {
  const fetcher = async () => {
    const query: Record<string, any> = {};
    if (category && category !== 'ALL') {
      query.category = category;
    }
    if (style && style !== 'ALL') {
      query.$or = [
        { style: { $regex: style, $options: 'i' } },
        { tags: { $in: [new RegExp(style, 'i')] } }
      ];
    }
    if (author && author !== 'ALL') {
      query.author = { $regex: author, $options: 'i' };
    }
    const products = await ProductModel.find(query).sort({ createdAt: -1 }).lean();
    return products.map((product: any) => ({
      ...product,
      authorSlug: product.authorSlug || product.ownerUid || product.storeOwnerUid || null
    }));
  };
  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }
  const cacheKey = `marketplace-${category || 'all'}-${style || 'all'}-${author || 'all'}`;
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

export async function getCachedMatchmakerResults(userUid: string) {
  const fetcher = async () => {
    const sessionNeo4j = getNeo4jSession();
    try {
      const query = `
        MATCH (u:Oiseau {uid: $userUid})
        MATCH (other:Oiseau) WHERE other.uid <> $userUid
        OPTIONAL MATCH (u)-[:WANTS]->(p:Product)<-[:OWNS]-(other)
        OPTIONAL MATCH (other)-[:WANTS]->(p2:Product)<-[:OWNS]-(u)
        RETURN other.uid AS matchUid,
               other.pseudo AS matchPseudo,
               collect(DISTINCT p.uid) AS itemsTheyHaveThatYouWant,
               collect(DISTINCT p2.uid) AS itemsYouHaveThatTheyWant
        LIMIT 5
      `;
      const result = await sessionNeo4j.run(query, { userUid });
      return result.records.map((record: any) => ({
        matchUid: record.get('matchUid'),
        matchPseudo: record.get('matchPseudo') || 'Oiseau Inconnu',
        itemsTheyHaveThatYouWant: (record.get('itemsTheyHaveThatYouWant') || []).filter(Boolean),
        itemsYouHaveThatTheyWant: (record.get('itemsYouHaveThatTheyWant') || []).filter(Boolean)
      })).filter((m: any) => m.itemsTheyHaveThatYouWant.length > 0 || m.itemsYouHaveThatTheyWant.length > 0);
    } finally {
      if (sessionNeo4j) {
        await sessionNeo4j.close().catch((err) => console.error("  [NEO4J CLOSE ERROR]", err));
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