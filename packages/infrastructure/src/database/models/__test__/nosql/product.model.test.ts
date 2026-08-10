import { describe, it, expect } from 'vitest';
import { ProductModel } from '../../nosql/product.model';

describe('Product Model', () => {
    it('🟢 doit valider un produit conforme avec toutes ses valeurs requises et par défaut', () => {
        const validData = {
            uid: 'prod_123',
            storeUid: 'store_canopee_1',
            title: 'Plume Sélénite de Collection',
            slug: 'plume-selenite-de-collection',
            description: 'Une plume gravée pour tracer des glyphes dans la Silice.',
            priceCents: 2500,
            category: 'FONT_SPRITE',
            visibility: 'PUBLIC',
        };

        const product = new ProductModel(validData);
        expect(product.uid).toBe('prod_123');
        expect(product.storeUid).toBe('store_canopee_1');
        expect(product.title).toBe('Plume Sélénite de Collection');
        expect(product.slug).toBe('plume-selenite-de-collection');
        expect(product.description).toBe('Une plume gravée pour tracer des glyphes dans la Silice.');
        expect(product.priceCents).toBe(2500);
        expect(product.category).toBe('FONT_SPRITE');
        expect(product.visibility).toBe('PUBLIC');
        expect(product.currency).toBe('EUR');
        expect(product.stock).toBe(1);
    });

    it('🔴 doit rejeter un produit si les champs obligatoires stricts (uid, storeUid, title, slug, description, priceCents, category) manquent', () => {
        const invalidData = {
            currency: 'USD',
            // Les champs required racine (hors visibility qui a un default) sont omis
        };

        const error = new ProductModel(invalidData).validateSync();
        expect(error?.errors?.uid).toBeDefined();
        expect(error?.errors?.storeUid).toBeDefined();
        expect(error?.errors?.title).toBeDefined();
        expect(error?.errors?.slug).toBeDefined();
        expect(error?.errors?.description).toBeDefined();
        expect(error?.errors?.priceCents).toBeDefined();
        expect(error?.errors?.category).toBeDefined();
    });

    it('🔴 doit rejeter un produit avec une catégorie ou une visibilité non valide par rapport aux énumérations', () => {
        const invalidData = {
            uid: 'prod_456',
            storeUid: 'store_1',
            title: 'Test',
            slug: 'test',
            description: 'Description',
            priceCents: 100,
            category: 'UNKNOWN_CATEGORY', // Invalide
            visibility: 'UNKNOWN_VISIBILITY', // Invalide
        };

        const error = new ProductModel(invalidData).validateSync();
        expect(error?.errors?.category).toBeDefined();
        expect(error?.errors?.visibility).toBeDefined();
    });
});