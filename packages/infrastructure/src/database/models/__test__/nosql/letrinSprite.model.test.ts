import { describe, it, expect } from 'vitest';
import { LetrinFontSpriteModel } from '../../nosql/letrinSprite.model'; 

describe('Silice : LetrinFontSprite Model (Forge Alchimique)', () => {
    it('🟢 doit valider une police/sprite de lettre avec ses valeurs requises, taxonomie et gamification', () => {
        const validData = {
            uid: 'font_sprite_123',
            name: 'Gothique Corrompue',
            slug: 'gothique-corrompue',
            authorUid: 'bird_author_99',
            category: 'GOTHIQUE',
            tags: ['sombre', 'cyberpunk', 'glitch'],
            frequencyHz: 396, // Fréquence de libération de la peur
            gamification: {
                palette: ['#000000', '#E5484D', '#111827'], // 3 couleurs débloquées
                alchemicalXp: 450,
                glitchCorruptionLevel: 3,
                unlockedFontSlots: 3,
                unlockedSpriteSlots: 3
            },
            glyphs: [
                {
                    character: 'A',
                    unicodeCodePoint: 'U+0041',
                    frames: [
                        {
                            frameIndex: 0,
                            width: 16,
                            height: 16,
                            pixels: ['#000000', '#E5484D']
                        }
                    ],
                    advanceWidth: 16,
                    barter: {
                        isBarterable: true,
                        barterValueKarma: 50
                    }
                }
            ]
        };

        const fontSprite = new LetrinFontSpriteModel(validData);
        expect(fontSprite.uid).toBe('font_sprite_123');
        expect(fontSprite.slug).toBe('gothique-corrompue');
        expect(fontSprite.category).toBe('GOTHIQUE');
        expect(fontSprite.tags).toContain('glitch');
        expect(fontSprite.frequencyHz).toBe(396);
        expect(fontSprite.isFrequencyMuted).toBe(false); // Valeur par défaut
        
        // Vérification Gamification
        expect(fontSprite.gamification.palette).toHaveLength(3);
        expect(fontSprite.gamification.alchemicalXp).toBe(450);
        expect(fontSprite.gamification.unlockedFontSlots).toBe(3); // Valeur par défaut/initiale
        
        // Vérification Barter/Troc
        expect(fontSprite.glyphs[0].barter?.isBarterable).toBe(true);
        expect(fontSprite.glyphs[0].barter?.barterValueKarma).toBe(50);
    });

    it('🔴 doit rejeter une création si les piliers fondateurs (uid, name, slug, authorUid) manquent', () => {
        const invalidData = {
            status: 'RELEASED',
        };

        const error = new LetrinFontSpriteModel(invalidData).validateSync();
        expect(error?.errors?.uid).toBeDefined();
        expect(error?.errors?.name).toBeDefined();
        expect(error?.errors?.slug).toBeDefined();
        expect(error?.errors?.authorUid).toBeDefined();
    });

    it('🔴 doit rejeter une catégorie inconnue (hors de la classification historique)', () => {
        const invalidData = {
            uid: 'font_456',
            name: 'Test',
            slug: 'test',
            authorUid: 'bird_author_99',
            category: 'FUTURISTE_INCONNUE', // Invalide
        };

        const error = new LetrinFontSpriteModel(invalidData).validateSync();
        expect(error?.errors?.category).toBeDefined();
    });

    it('🐣 doit appliquer les grâces originelles (valeurs par défaut) pour un profil vierge', () => {
        const minimalData = {
            uid: 'font_789',
            name: 'Police Basique',
            slug: 'police-basique',
            authorUid: 'bird_new',
        };

        const minimalFont = new LetrinFontSpriteModel(minimalData);
        expect(minimalFont.status).toBe('DRAFT');
        expect(minimalFont.category).toBe('LINEALE');
        expect(minimalFont.frequencyHz).toBe(432); // Fréquence de base
        expect(minimalFont.gamification.unlockedFontSlots).toBe(3);
        expect(minimalFont.gamification.unlockedSpriteSlots).toBe(3);
        expect(minimalFont.copyrightClaimed).toBe(true);
    });
});