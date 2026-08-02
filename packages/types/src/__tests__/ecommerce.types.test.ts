import { describe, it, expect } from 'vitest';
import { StoreSchema, ProductSchema, WishlistSchema, OrderSchema, BarterOfferSchema } from '../core/ecommerce.types';

describe('Ecommerce Types - Validation Zod (Boutiques, Produits, Wishlist, Commandes & Troc)', () => {
  it('🟢 doit valider une boutique valide', () => {
    const store = { 
      uid: 'store-1', 
      ownerUid: 'bird-1', 
      storeName: 'Boutique des Artefacts', 
      slug: 'boutique-des-artefacts', // 🪡 Ajout du slug
      isVerified: true 
    };
    expect(StoreSchema.safeParse(store).success).toBe(true);
  });

  it('🟢 doit valider un produit valide', () => {
    const product = { 
      uid: 'prod-1', 
      storeUid: 'store-1', 
      title: 'Police LetrIn', 
      slug: 'police-letrin', // 🪡 Ajout du slug
      description: 'Une police cyberpunk', 
      priceCents: 1500, 
      category: 'FONT_SPRITE' 
    };
    expect(ProductSchema.safeParse(product).success).toBe(true);
  });

  it('🟢 doit valider une wishlist', () => {
    const wishlist = { 
      uid: 'wish-1', 
      userUid: 'bird-1', 
      productUids: ['prod-1'] 
    };
    expect(WishlistSchema.safeParse(wishlist).success).toBe(true);
  });

  it('🟢 doit valider une commande', () => {
    const order = { 
      uid: 'ord-1', 
      buyerUid: 'bird-2', 
      storeUid: 'store-1', 
      items: [{ productUid: 'prod-1', title: 'Police', priceCents: 1500, quantity: 1 }], 
      totalAmountCents: 1500, 
      stripePaymentIntentId: 'pi_123' 
    };
    expect(OrderSchema.safeParse(order).success).toBe(true);
  });

  it('🟢 doit valider une offre de troc (BarterOffer)', () => {
    const barter = {
      uid: 'barter-1',
      initiatorUid: 'bird-1',
      receiverUid: 'bird-2',
      offeredProductUids: ['prod-1'],
      requestedProductUids: ['prod-2'],
      status: 'PENDING'
    };
    expect(BarterOfferSchema.safeParse(barter).success).toBe(true);
  });
});