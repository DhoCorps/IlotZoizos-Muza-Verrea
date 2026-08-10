import { describe, it, expect } from 'vitest';
import { StoreModel } from '../../nosql/store.model';

describe('Store Model', () => {
    it('🟢 doit valider une boutique conforme avec toutes ses valeurs requises et par défaut', () => {
        const validData = {
            uid: 'store_123',
            ownerUid: 'bird_owner_1',
            storeName: 'La Boutique de la Canopée',
            slug: 'la-boutique-de-la-canopee',
            description: 'Artéfacts et glyphes gravés dans la Silice.',
        };

        const store = new StoreModel(validData);
        expect(store.uid).toBe('store_123');
        expect(store.ownerUid).toBe('bird_owner_1');
        expect(store.storeName).toBe('La Boutique de la Canopée');
        expect(store.slug).toBe('la-boutique-de-la-canopee');
        expect(store.description).toBe('Artéfacts et glyphes gravés dans la Silice.');
        expect(store.isVerified).toBe(false); // Valeur par défaut
    });

    it('🔴 doit rejeter une boutique si les champs obligatoires (uid, ownerUid, storeName, slug) manquent', () => {
        const invalidData = {
            description: 'Boutique orpheline sans identifiants',
        };

        const error = new StoreModel(invalidData).validateSync();
        expect(error?.errors?.uid).toBeDefined();
        expect(error?.errors?.ownerUid).toBeDefined();
        expect(error?.errors?.storeName).toBeDefined();
        expect(error?.errors?.slug).toBeDefined();
    });
});