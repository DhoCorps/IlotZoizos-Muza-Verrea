import { describe, it, expect } from 'vitest';
import { OiseauInventoryModel } from '../../nosql/userInventory.model'; // Ajuste le chemin relatif selon ton arborescence

describe('OiseauInventory Model', () => {
    it('🟢 doit valider un inventaire d\'oiseau conforme avec toutes ses valeurs requises et par défaut', () => {
        const validData = {
            userUid: 'bird_owner_123',
        };

        const inventory = new OiseauInventoryModel(validData);
        expect(inventory.userUid).toBe('bird_owner_123');
        expect(inventory.parchemins).toBe(0);     // Valeur par défaut
        expect(inventory.plumes).toBe(0);         // Valeur par défaut
        expect(inventory.vinyles).toBe(0);        // Valeur par défaut
        expect(inventory.sampleNotes).toBe(0);    // Valeur par défaut
        expect(inventory.totamtoes).toBe(0);      // Valeur par défaut
        expect(inventory.alveoleLevel).toBe(1);   // Valeur par défaut (Niveau 1: Coffre)
        expect(inventory.unlockedUnlocks).toEqual([]); // Valeur par défaut
    });

    it('🔴 doit rejeter un inventaire si le champ obligatoire (userUid) manque', () => {
        const invalidData = {
            parchemins: 10,
            // userUid est omis
        };

        const error = new OiseauInventoryModel(invalidData).validateSync();
        expect(error?.errors?.userUid).toBeDefined();
    });

    it('🔴 doit rejeter un inventaire si les ressources ou le niveau d\'alvéole violent les contraintes min/max', () => {
        const invalidData = {
            userUid: 'bird_owner_123',
            parchemins: -5,        // Interdit par min: 0
            alveoleLevel: 5,       // Interdit par max: 4
        };

        const error = new OiseauInventoryModel(invalidData).validateSync();
        expect(error?.errors?.parchemins).toBeDefined();
        expect(error?.errors?.alveoleLevel).toBeDefined();
    });
});