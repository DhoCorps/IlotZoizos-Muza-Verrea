import { describe, it, expect } from 'vitest';
import { LetterSpriteModel } from '../../nosql/letrinSprite.model'; // Ajuste le chemin relatif selon ton arborescence

describe('LetterSprite Model', () => {
    it('🟢 doit valider un sprite de lettre conforme avec toutes ses valeurs requises et par défaut', () => {
        const validData = {
            uid: 'sprite_123',
            name: 'Sprite Animé Canopée',
            slug: 'sprite-anime-canopee',
            authorUid: 'bird_author_99',
            glyphs: [
                {
                    character: 'A',
                    unicodeCodePoint: 'U+0041',
                    frames: [
                        {
                            frameIndex: 0,
                            width: 16,
                            height: 16,
                            pixels: ['#000000', '#FFFFFF']
                        }
                    ],
                    advanceWidth: 16
                }
            ]
        };

        const sprite = new LetterSpriteModel(validData);
        expect(sprite.uid).toBe('sprite_123');
        expect(sprite.name).toBe('Sprite Animé Canopée');
        expect(sprite.slug).toBe('sprite-anime-canopee');
        expect(sprite.authorUid).toBe('bird_author_99');
        expect(sprite.gridSize.width).toBe(16); // Valeur par défaut
        expect(sprite.gridSize.height).toBe(16); // Valeur par défaut
        expect(sprite.status).toBe('DRAFT'); // Valeur par défaut
        expect(sprite.glyphs).toHaveLength(1);
        expect(sprite.glyphs[0].character).toBe('A');
    });

    it('🔴 doit rejeter un sprite si les champs obligatoires racine (uid, name, slug, authorUid) manquent', () => {
        const invalidData = {
            status: 'RELEASED',
        };

        const error = new LetterSpriteModel(invalidData).validateSync();
        expect(error?.errors?.uid).toBeDefined();
        expect(error?.errors?.name).toBeDefined();
        expect(error?.errors?.slug).toBeDefined();
        expect(error?.errors?.authorUid).toBeDefined();
    });

    it('🔴 doit rejeter un sprite avec un status non valide par rapport à l\'énumération', () => {
        const invalidData = {
            uid: 'sprite_456',
            name: 'Test',
            slug: 'test',
            authorUid: 'bird_author_99',
            status: 'UNKNOWN_STATUS', // Invalide
        };

        const error = new LetterSpriteModel(invalidData).validateSync();
        expect(error?.errors?.status).toBeDefined();
    });
});