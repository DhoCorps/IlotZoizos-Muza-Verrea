import { describe, it, expect } from 'vitest';
import {
  StoreSchema,
  ProductSchema,
  RouletteSessionSchema,
  OrderSchema,
  BarterOfferSchema
} from '../core/ecommerce.types';

describe('Ecommerce Types & Schemas', () => {
  
  it('🟢 doit valider un Store complet', () => {
    const store = {
      uid: 'store_123',
      ownerUid: 'bird_456',
      storeName: 'La Boutique Obscure',
      slug: 'boutique-obscure'
    };
    
    const result = StoreSchema.safeParse(store);
    expect(result.success).toBe(true);
  });

  it('🟢 doit valider un Produit et vérifier les règles de prix et la devise par défaut', () => {
    const product = {
      uid: 'prod_1',
      storeUid: 'store_1',
      title: 'Artefact Mystique',
      slug: 'artefact-mystique',
      description: 'Un objet rare forgé dans la Silice.',
      nature: 'DIGITAL',
      priceExclTaxCents: 1000,
      priceCents: 1200,
      category: 'DIGITAL_GOOD'
    };
    
    const result = ProductSchema.safeParse(product);
    expect(result.success).toBe(true);
    if (result.success) {
      // Vérifie que la devise a bien été attribuée via le .default() du CurrencyEnum
      expect(result.data.currency).toBeDefined();
      expect(result.data.stock).toBe(1); // Valeur par défaut
    }
  });

  it('🔴 doit rejeter un produit avec un prix négatif', () => {
    const invalidProduct = {
      uid: 'prod_2',
      storeUid: 'store_1',
      title: 'Objet Corrompu',
      slug: 'objet-corrompu',
      description: 'Test',
      priceExclTaxCents: -500, // 🚨 Interdit
      priceCents: -600, // 🚨 Interdit
      category: 'DIGITAL_GOOD'
    };
    
    const result = ProductSchema.safeParse(invalidProduct);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errorPaths = result.error.errors.map(e => e.path.join('.'));
      expect(errorPaths).toContain('priceExclTaxCents');
      expect(errorPaths).toContain('priceCents');
    }
  });

  describe('⏳ Harmonisation des Dates (z.coerce.date)', () => {
    
    const isoDateString = "2026-10-10T14:00:00.000Z";

    it('🟢 doit coercer une string ISO en objet Date pour RouletteSessionSchema', () => {
      const roulette = {
        uid: 'roulette_1',
        buyerUid: 'bird_1',
        productUid: 'prod_1',
        rolledPriceCents: 500,
        expiresAt: isoDateString,
        createdAt: isoDateString
      };
      
      const result = RouletteSessionSchema.safeParse(roulette);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.expiresAt).toBeInstanceOf(Date);
        expect(result.data.createdAt).toBeInstanceOf(Date);
        expect(result.data.expiresAt.toISOString()).toBe(isoDateString);
      }
    });

    it('🟢 doit coercer une string ISO en objet Date pour OrderSchema', () => {
      const order = {
        uid: 'order_1',
        buyerUid: 'bird_1',
        storeUid: 'store_1',
        items: [{ productUid: 'prod_1', title: 'Test', priceCents: 100, quantity: 1 }],
        totalAmountCents: 100,
        stripePaymentIntentId: 'pi_123',
        createdAt: isoDateString
      };
      
      const result = OrderSchema.safeParse(order);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.createdAt).toBeInstanceOf(Date);
      }
    });

    it('🟢 doit coercer une string ISO en objet Date pour BarterOfferSchema', () => {
      const barter = {
        uid: 'barter_1',
        initiatorUid: 'bird_1',
        offeredProductUids: ['prod_1'],
        requestedProductUids: ['prod_2'],
        createdAt: isoDateString
      };
      
      const result = BarterOfferSchema.safeParse(barter);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.createdAt).toBeInstanceOf(Date);
      }
    });
  });
});