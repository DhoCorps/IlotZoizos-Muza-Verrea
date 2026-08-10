import { describe, it, expect } from 'vitest';
import { WishlistModel } from '../../nosql/wishlist.model'; // Ajuste le chemin relatif selon ton arborescence

describe('Wishlist Model', () => {
    it('🟢 doit valider une liste de souhaits conforme avec toutes ses valeurs requises et par défaut', () => {
        const validData = {
            uid: 'wish_123',
            userUid: 'bird_user_1',
            name: 'Favoris de la Canopée',
            productUids: ['prod_99', 'prod_100'],
        };

        const wishlist = new WishlistModel(validData);
        expect(wishlist.uid).toBe('wish_123');
        expect(wishlist.userUid).toBe('bird_user_1');
        expect(wishlist.name).toBe('Favoris de la Canopée');
        expect(wishlist.productUids).toEqual(['prod_99', 'prod_100']);
    });

    it('🔴 doit rejeter une liste de souhaits si les champs obligatoires (uid, userUid, name) manquent', () => {
        const invalidData = {
            productUids: ['prod_99'],
            // uid, userUid et name sont omis
        };

        const error = new WishlistModel(invalidData).validateSync();
        expect(error?.errors?.uid).toBeDefined();
        expect(error?.errors?.userUid).toBeDefined();
        expect(error?.errors?.name).toBeDefined();
    });
});