import { describe, it, expect } from 'vitest';
import { 
  StoreSchema, 
  ProductSchema, 
  WishlistSchema, 
  OrderSchema, 
  BarterOfferSchema, 
  RouletteSessionSchema,
} from '../core/ecommerce.types';

describe('Ecommerce Types - Validation Zod Avancée (Coût, Marge Kompta, Roulette & Loterie)', () => {
  it('🟢 doit valider une boutique valide', () => {
    const store = { 
      uid: 'store-1', 
      ownerUid: 'bird-1', 
      storeName: 'Boutique des Artefacts', 
      slug: 'boutique-des-artefacts', 
      isVerified: true 
    };
    expect(StoreSchema.safeParse(store).success).toBe(true);
  });

  it('🟢 doit valider un produit avec coût de revient et calcul de marge pour Kompta', () => {
    const product = { 
      uid: 'prod-1', 
      storeUid: 'store-1', 
      title: 'Police LetrIn', 
      slug: 'police-letrin', 
      description: 'Une police cyberpunk', 
      nature: 'DIGITAL',
      priceExclTaxCents: 1250,
      taxRatePercent: 20,
      priceCents: 1500, // TTC
      costPriceCents: 300, // Coût de fabrication/revient interne
      marginCents: 950, // 1250 (HT) - 300 (Coût)
      marginPercent: 76,
      currency: 'EUR',
      category: 'FONT_SPRITE',
      tags: ['cyberpunk', 'font'],
      seoMetadata: {
        title: 'Police LetrIn',
        description: 'Police exclusive.'
      },
      isRouletteActive: true,
      wagerAmount: 5,
      variants: [
        { uid: 'var-1', name: 'Standard', priceOffsetCents: 0, costPriceCents: 300, stock: 50 }
      ]
    };
    expect(ProductSchema.safeParse(product).success).toBe(true);
  });

  it('🟢 doit valider un produit de type LUCKY_DROP', () => {
    const luckyDropProduct = {
      uid: 'prod-lucky',
      storeUid: 'store-1',
      title: 'Artefact Mystère (Loterie)',
      slug: 'artefact-mystere-loterie',
      description: 'Le grand lot de la saison',
      priceCents: 0,
      priceExclTaxCents: 0,
      category: 'LUCKY_DROP'
    };
    expect(ProductSchema.safeParse(luckyDropProduct).success).toBe(true);
  });

  it('🟢 doit valider une session de roulette karmique', () => {
    const session = {
      uid: 'roulette-sess-1',
      buyerUid: 'bird-2',
      productUid: 'prod-1',
      rolledPriceCents: 750,
      status: 'PENDING',
      expiresAt: new Date()
    };
    expect(RouletteSessionSchema.safeParse(session).success).toBe(true);
  });

  it('🟢 doit valider une wishlist', () => {
    const wishlist = { 
      uid: 'wish-1', 
      userUid: 'bird-1', 
      productUids: ['prod-1'] 
    };
    expect(WishlistSchema.safeParse(wishlist).success).toBe(true);
  });

  it('🟢 doit valider une commande incluant le suivi des coûts (Kompta)', () => {
    const order = { 
      uid: 'ord-1', 
      buyerUid: 'bird-2', 
      storeUid: 'store-1', 
      items: [{ productUid: 'prod-1', variantUid: 'var-1', title: 'Police - Standard', priceCents: 1500, costPriceCents: 300, quantity: 1 }], 
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