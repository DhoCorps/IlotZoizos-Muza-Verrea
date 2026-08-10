import { describe, it, expect } from 'vitest';
import { FontModel } from '../../nosql/font.model';

describe('Font Model', () => {
    it('🟢 doit valider une police conforme avec tous ses champs requis et valeurs par défaut', () => {
        const validData = {
            uid: 'font_123',
            name: 'Canopée Script',
            slug: 'canopee-script',
            authorUid: 'bird_creator_1',
            gridSize: {
                width: 8,
                height: 8,
            },
            glyphs: [
                {
                    char: 'A',
                    matrix: [
                        [0, 1, 1, 0],
                        [1, 0, 0, 1]
                    ]
                }
            ],
        };

        const font = new FontModel(validData);
        expect(font.uid).toBe('font_123');
        expect(font.name).toBe('Canopée Script');
        expect(font.slug).toBe('canopee-script');
        expect(font.authorUid).toBe('bird_creator_1');
        expect(font.gridSize.width).toBe(8);
        expect(font.gridSize.height).toBe(8);
        expect(font.status).toBe('DRAFT'); // Vérifie la valeur par défaut du status
        expect(font.glyphs).toHaveLength(1);
        expect(font.glyphs[0].char).toBe('A');
    });

    it('🔴 doit rejeter une police si les champs requis (uid, name, slug, authorUid) manquent', () => {
        const invalidData = {
            status: 'RELEASED',
        };

        const error = new FontModel(invalidData).validateSync();
        expect(error?.errors?.uid).toBeDefined();
        expect(error?.errors?.name).toBeDefined();
        expect(error?.errors?.slug).toBeDefined();
        expect(error?.errors?.authorUid).toBeDefined();
    });

    it('🔴 doit rejeter une police avec un statut non valide par rapport à l\'énumération', () => {
        const invalidData = {
            uid: 'font_456',
            name: 'Test Police',
            slug: 'test-police',
            authorUid: 'bird_creator_1',
            status: 'UNKNOWN_STATUS', // Invalide
        };

        const error = new FontModel(invalidData).validateSync();
        expect(error?.errors?.status).toBeDefined();
    });
});