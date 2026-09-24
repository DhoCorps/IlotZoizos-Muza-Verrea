import { describe, it, expect } from 'vitest';
import { ProductModel } from '../../nosql/product.model';

describe('Product Model - Mongoose, Kompta & Copyright Integration', () => {
    it('🟢 doit valider un produit conforme avec toutes ses valeurs requises, sa TVA, son coût de revient, ses tags indexés et son copyright enrichi', () => {
        const validData = {
            uid: 'prod_123',
            storeUid: 'store_canopee_1',
            title: 'Plume Sélénite de Collection',
            slug: 'plume-selenite-de-collection',
            description: 'Une plume gravée pour tracer des glyphes dans la Silice.',
            nature: 'PHYSICAL',
            priceExclTaxCents: 2083,
            taxRatePercent: 20,
            priceCents: 2500, 
            costPriceCents: 800, 
            marginCents: 1283, 
            marginPercent: 60,
            tags: ['sélénite', 'plume', 'artifact'],
            seoMetadata: {
                title: 'Plume Sélénite',
                description: 'Achetez la plume exclusive.'
            },
            copyrightMetadata: {
                role: 'SUBLIMATOR',
                originalAuthor: 'Artisan Sélénite',
                sublimationNotes: 'Polissage personnalisé',
                isExclusiveIlot: true
            },
            isRouletteActive: true,
            wagerAmount: 10,
            category: 'PHYSICAL_ARTIFACT',
            visibility: 'PUBLIC',
        };

        const product = new ProductModel(validData);
        expect(product.uid).toBe('prod_123');
        expect(product.storeUid).toBe('store_canopee_1');
        expect(product.title).toBe('Plume Sélénite de Collection');
        expect(product.slug).toBe('plume-selenite-de-collection');
        expect(product.priceCents).toBe(2500);
        expect(product.costPriceCents).toBe(800);
        expect(product.tags).toContain('sélénite');
        expect(product.isRouletteActive).toBe(true);
        expect(product.wagerAmount).toBe(10);
        expect(product.currency).toBe('EUR');
        expect(product.stock).toBe(1);
        expect(product.copyrightMetadata?.role).toBe('SUBLIMATOR');
        expect(product.copyrightMetadata?.isExclusiveIlot).toBe(true);
    });

    it('🔴 doit rejeter un produit si les champs obligatoires stricts (storeUid, title, slug, description, priceCents, category) manquent', () => {
        const invalidData = {
            currency: 'USD',
        };

        const error = new ProductModel(invalidData).validateSync();
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
            category: 'UNKNOWN_CATEGORY',    
            visibility: 'UNKNOWN_VISIBILITY', 
        };

        const error = new ProductModel(invalidData).validateSync();
        expect(error?.errors?.category).toBeDefined();
        expect(error?.errors?.visibility).toBeDefined();
    });
});