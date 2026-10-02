import { describe, it, expect } from 'vitest';
import { LetrinFontSpriteSchema, TypographicCategoryEnum } from '@ilot/types';

describe('Letr\'In Sprite - Validation des Schémas Zod et de la Gamification', () => {
  const validSpriteFont = {
    uid: 'font-sprite-001',
    name: 'Pixel Abyss Font',
    slug: 'pixel-abyss-font',
    authorUid: 'bird-alpha',
    gridSize: { width: 16, height: 16 },
    category: TypographicCategoryEnum.FANTAISIE,
    tags: ['pixel-art', 'cyberpunk'],
    frequencyHz: 528,
    isFrequencyMuted: false,
    
    // 🚀 Intégration du sceau cryptographique unifié
    cryptoSeal: {
      digitalSignature: '9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca7',
      timestampedAt: new Date(),
      sealedByUid: 'bird-alpha',
      copyrightMetadata: {
        role: 'CREATOR',
        isExclusiveIlot: true,
        license: 'MIT / Libre Canopée', // Satisfaction de Zod
      }
    },

    glyphs: [
      {
        character: '<(:<',
        unicodeCodePoint: 'U+E001',
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
          barterValueKarma: 15
        }
      }
    ],
    gamification: {
      palette: ['#E5484D', '#10B981', '#3B82F6', '#000000'],
      alchemicalXp: 120,
      glitchCorruptionLevel: 2,
      unlockedFontSlots: 3,
      unlockedSpriteSlots: 3
    },
    status: 'DRAFT'
  };

  it('🟢 doit valider un ensemble de police de sprites complet avec classification, gamification et sceau cryptographique', () => {
    const result = LetrinFontSpriteSchema.safeParse(validSpriteFont);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe(TypographicCategoryEnum.FANTAISIE);
      expect(result.data.frequencyHz).toBe(528);
      expect(result.data.gamification?.palette.length).toBe(4);
      // 🚀 Validation du Sceau
      expect(result.data.cryptoSeal?.digitalSignature).toBeDefined();
      expect(result.data.cryptoSeal?.copyrightMetadata?.role).toBe('CREATOR');
    }
  });

  it('🔴 doit rejeter une structure de police sans nom', () => {
    const invalid = { ...validSpriteFont, name: '' };
    const result = LetrinFontSpriteSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('🐣 doit appliquer les valeurs par défaut (catégorie LINEALE, 432Hz, status DRAFT)', () => {
    const minimal = {
      uid: 'font-sprite-002',
      name: 'Minimal Font',
      slug: 'minimal-font',
      authorUid: 'bird-beta',
      gridSize: { width: 8, height: 8 },
      glyphs: []
    };
    const parsed = LetrinFontSpriteSchema.parse(minimal);
    expect(parsed.status).toBe('DRAFT');
    expect(parsed.category).toBe(TypographicCategoryEnum.LINEALE);
    expect(parsed.frequencyHz).toBe(432);
    expect(parsed.isFrequencyMuted).toBe(false);
    expect(parsed.cryptoSeal).toBeUndefined(); // Optionnel par défaut
  });
});