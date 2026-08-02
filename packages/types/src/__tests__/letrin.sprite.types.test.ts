import { describe, it, expect } from 'vitest';
import { LetrinFontSpriteSchema } from '@ilot/types';

describe('Letr\'In Sprite - Validation des Schémas Zod', () => {
  const validSpriteFont = {
    uid: 'font-sprite-001',
    name: 'Pixel Abyss Font',
    slug: 'pixel-abyss-font', // 🪡
    authorUid: 'bird-alpha',
    gridSize: { width: 16, height: 16 },
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
        advanceWidth: 16
      }
    ],
    status: 'DRAFT'
  };

  it('🟢 doit valider un ensemble de police de sprites complet', () => {
    const result = LetrinFontSpriteSchema.safeParse(validSpriteFont);
    expect(result.success).toBe(true);
  });

  it('🔴 doit rejeter une structure de police sans nom', () => {
    const invalid = { ...validSpriteFont, name: '' };
    const result = LetrinFontSpriteSchema.safeParse(invalid);
    // Maintenant que l'on a z.string().min(1), ça retournera bien false !
    expect(result.success).toBe(false); 
  });

  it('🐣 doit appliquer les valeurs par défaut (status DRAFT)', () => {
    const minimal = {
      uid: 'font-sprite-002',
      name: 'Minimal Font',
      slug: 'minimal-font', // 🪡
      authorUid: 'bird-beta',
      gridSize: { width: 8, height: 8 },
      glyphs: []
    };
    const parsed = LetrinFontSpriteSchema.parse(minimal);
    expect(parsed.status).toBe('DRAFT');
  });
});