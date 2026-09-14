// packages/shared-core/src/sync-engine/__tests__/letrinSprite.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LetrinSpriteOrchestrator } from '../letrinSprite.orchestrator';
import { TransactionManager } from '../transactionManager';
import { FontModel, OiseauModel } from '@ilot/infrastructure';
import { IlotError } from '../../errors/ilot.errors';

const mockFindOneAndUpdate = vi.fn();

// 🛡️ MOCK UNIFIÉ ET SÉCURISÉ DE L'INFRASTRUCTURE
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    OiseauModel: {
      findOne: vi.fn(),
    },
    FontModel: {
      findOneAndUpdate: (...args: any[]) => mockFindOneAndUpdate(...args),
    },
  };
});

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (name, cb) => cb({} as any, { run: vi.fn().mockResolvedValue({ records: [{ get: () => 'font_1' }] }) })),
  },
}));

describe('LetrinSpriteOrchestrator - Atelier Typographique Letr\'in (Police & Sprites)', () => {
  let orchestrator: LetrinSpriteOrchestrator;
  const validSignature = { actorUid: 'bird_typographer', capabilities: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new LetrinSpriteOrchestrator();

    // Simulation de la résolution canonique
    vi.mocked(OiseauModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ uid: 'bird_canonical_123' })
    } as any);
  });

  describe('publishFontSprite (Police et Glyphs)', () => {
    it('🔴 doit rejeter (401) si l\'Oiseau n\'est pas authentifié', async () => {
      await expect(
        orchestrator.publishFontSprite({
          uid: 'f1',
          name: 'Pixel Font',
          slug: 'pixel-font',
          authorUid: 'b1',
          gridSize: { width: 8, height: 8 },
          glyphs: []
        }, { capabilities: [] } as any)
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit sédimenter la police complète (Font) incluant majuscules, minuscules et caractères spéciaux', async () => {
      const mockFontData = {
        uid: 'font_alpha',
        name: 'Canopy Sans Font',
        slug: 'canopy-sans-font',
        authorUid: 'bird_typographer',
        gridSize: { width: 16, height: 16 },
        glyphs: [
          { char: 'A', matrix: [[0, 1], [1, 0]], unicodeHex: 'U+0041' }, // Majuscule
          { char: 'a', matrix: [[1, 1], [0, 0]], unicodeHex: 'U+0061' }, // Minuscule
          { char: 'é', matrix: [[1, 0], [1, 0]], unicodeHex: 'U+00E9' }, // Accent
          { char: '@', matrix: [[0, 0], [1, 1]], unicodeHex: 'U+0040' }  // Caractère spécial
        ],
        status: 'RELEASED' as const
      };

      mockFindOneAndUpdate.mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce(mockFontData),
      });

      const res = await orchestrator.publishFontSprite(mockFontData, validSignature as any);

      expect(res.success).toBe(true);
      expect(res.name).toBe('Canopy Sans Font');
      expect(res.slug).toBe('canopy-sans-font');
      expect(res.glyphsCount).toBe(4); // Les 4 symboles de la police ont bien été traités
      expect(OiseauModel.findOne).toHaveBeenCalledTimes(1);
      expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(1);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });

    it('🔴 doit lever une erreur 404 si l\'Oiseau créateur n\'existe pas dans la Silice', async () => {
      vi.mocked(OiseauModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce(null) // L'oiseau n'existe pas
      } as any);

      await expect(
        orchestrator.publishFontSprite({
          uid: 'font_beta', name: 'Broken Font', slug: 'broken-font', authorUid: 'ghost', gridSize: { width: 8, height: 8 }, glyphs: []
        }, validSignature as any)
      ).rejects.toThrow(/Oiseau introuvable/);
    });
  });
});