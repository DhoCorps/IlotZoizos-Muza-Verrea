import { describe, it, expect } from 'vitest';
import { TaxonomyModel } from '../../nosql/taxonomy.model'; // Ajuste le chemin relatif selon ton arborescence

describe('Taxonomy Model', () => {
    it('🟢 doit valider une taxonomie conforme avec toutes ses valeurs requises et par défaut', () => {
        const validData = {
            uid: 'tax_123',
            name: 'Ambient Sélénite',
            domain: 'MUSIC',
            type: 'STYLE',
            creatorUid: 'bird_creator_1',
        };

        const taxonomy = new TaxonomyModel(validData);
        expect(taxonomy.uid).toBe('tax_123');
        expect(taxonomy.name).toBe('Ambient Sélénite');
        expect(taxonomy.domain).toBe('MUSIC');
        expect(taxonomy.type).toBe('STYLE');
        expect(taxonomy.creatorUid).toBe('bird_creator_1');
        expect(taxonomy.isCustom).toBe(false); // Valeur par défaut
    });

    it('🔴 doit rejeter une taxonomie si les champs obligatoires (uid, name, domain, type, creatorUid) manquent', () => {
        const invalidData = {
            isCustom: true,
            // Tous les champs required sont omis
        };

        const error = new TaxonomyModel(invalidData).validateSync();
        expect(error?.errors?.uid).toBeDefined();
        expect(error?.errors?.name).toBeDefined();
        expect(error?.errors?.domain).toBeDefined();
        expect(error?.errors?.type).toBeDefined();
        expect(error?.errors?.creatorUid).toBeDefined();
    });

    it('🔴 doit rejeter une taxonomie avec un domain ou un type non valide par rapport aux énumérations', () => {
        const invalidData = {
            uid: 'tax_456',
            name: 'Test',
            domain: 'UNKNOWN_DOMAIN', // Invalide
            type: 'UNKNOWN_TYPE',     // Invalide
            creatorUid: 'bird_1',
        };

        const error = new TaxonomyModel(invalidData).validateSync();
        expect(error?.errors?.domain).toBeDefined();
        expect(error?.errors?.type).toBeDefined();
    });
});