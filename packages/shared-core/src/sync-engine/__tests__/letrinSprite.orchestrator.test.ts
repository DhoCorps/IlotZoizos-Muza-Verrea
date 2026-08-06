// packages/shared-core/src/sync-engine/__test__/letrin.sprite.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LetrinSpriteOrchestrator } from '../../sync-engine/letrinSprite.orchestrator';
import { TransactionManager } from '../transactionManager';
import { FontModel } from '../../../../infrastructure/src/database/models/nosql/font.model';
import { IlotError } from '../../errors/ilot.errors';

vi.mock('@ilot/infrastructure/src/database/models/nosql/font.model', () => ({
  FontModel: {
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (name, cb) => cb({} as any, { run: vi.fn().mockResolvedValue({ records: [{ get: () => 'font_1' }] }) })),
  },
}));

describe('LetrinSpriteOrchestrator', () => {
  let orchestrator: LetrinSpriteOrchestrator;
  const validSignature = { actorUid: 'bird_typographer', capabilities: [] };
  const invalidSignature = { capabilities: [] }; // Sans actorUid

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new LetrinSpriteOrchestrator();
  });

  describe('publishFontSprite', () => {
    it('🔴 doit rejeter (401) si l’Oiseau n’est pas authentifié', async () => {
      await expect(
        orchestrator.publishFontSprite({
          uid: 'f1',
          name: 'Pixel Font',
          slug: 'pixel-font',
          authorUid: 'b1',
          gridSize: { width: 8, height: 8 },
          glyphs: []
        }, invalidSignature as any)
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit sédimenter la police dans MongoDB (Silice) et Neo4j (Graphe) avec succès', async () => {
      const mockFontData = {
        uid: 'font_alpha',
        name: 'Canopy Sans',
        slug: 'canopy-sans',
        authorUid: 'bird_typographer',
        gridSize: { width: 16, height: 16 },
        glyphs: [{ char: 'A', matrix: [[0, 1], [1, 0]] }],
        status: 'RELEASED' as const
      };

      vi.mocked(FontModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce(mockFontData),
      } as any);

      const res = await orchestrator.publishFontSprite(mockFontData, validSignature as any);

      expect(res.success).toBe(true);
      expect(res.uid).toBe('font_alpha');
      expect(res.slug).toBe('canopy-sans');
      expect(res.glyphsCount).toBe(1);
      expect(FontModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });

    it('🔴 doit lever une erreur 500 si la sédimentation Neo4j échoue', async () => {
      const mockFontData = {
        uid: 'font_beta',
        name: 'Broken Font',
        slug: 'broken-font',
        authorUid: 'bird_typographer',
        gridSize: { width: 8, height: 8 },
        glyphs: []
      };

      vi.mocked(FontModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce(mockFontData),
      } as any);

      // Simuler un retour vide de Neo4j
      vi.mocked(TransactionManager.execute).mockImplementationOnce(async (name, cb) => {
        return await cb({} as any, { run: vi.fn().mockResolvedValue({ records: [] }) } as any);
      });

      await expect(
        orchestrator.publishFontSprite(mockFontData, validSignature as any)
      ).rejects.toThrow(IlotError);
    });
  });
});