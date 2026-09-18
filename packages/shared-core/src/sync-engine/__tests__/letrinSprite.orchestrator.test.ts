import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LetrinSpriteOrchestrator } from '../letrinSprite.orchestrator';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';
import { ActionSignature } from '@ilot/types';
import * as orchestratorEngine from '../../utils/orchestrator.engine';
import { FontModel } from '@ilot/infrastructure';
import type { ClientSession } from 'mongoose';
import type { Transaction } from 'neo4j-driver';

// 🛡️ 1. Mock synchrone pur : évite les bugs de chargement asynchrone de Vitest
vi.mock('@ilot/infrastructure', () => ({
  OiseauModel: {},
  FontModel: {
    findOneAndUpdate: vi.fn(),
  },
  findEntityBySlugOrUid: vi.fn(),
}));

// 🛡️ 2. Mock du moteur d'orchestration
vi.mock('../../utils/orchestrator.engine', () => ({
  safeSyncUniversalInteraction: vi.fn(async () => {}),
  resolveCanonicalUid: vi.fn(async (_model, identifier: string) => {
    if (identifier === 'ghost') {
      throw new IlotError(`Oiseau auteur introuvable dans la Silice : ${identifier}`, "NOT_FOUND", 404);
    }
    return `resolved_${identifier}`;
  })
}));

// 🛡️ 3. Mock de la transaction
vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (_name: string, cb: (mongoSession: ClientSession, neo4jTx: Transaction) => Promise<unknown>) => 
      cb({} as ClientSession, { run: vi.fn().mockResolvedValue({ records: [{ get: () => 'font_1' }] }) } as unknown as Transaction)
    ),
  },
}));

describe('LetrinSpriteOrchestrator - Atelier Typographique Letr\'in (Police & Sprites)', () => {
  let orchestrator: LetrinSpriteOrchestrator;
  const validSignature: ActionSignature = { actorUid: 'bird_typographer', capabilities: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new LetrinSpriteOrchestrator();

    // 🛡️ 4. Assignation explicite du chaînage Mongoose avant chaque test
    // Cela garantit que .lean() existera TOUJOURS au moment de l'exécution
    vi.mocked(FontModel.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        uid: 'font_alpha',
        name: 'Canopy Sans Font',
        slug: 'canopy-sans-font',
        authorUid: 'bird_typographer',
        gridSize: { width: 16, height: 16 },
        glyphs: [],
        status: 'RELEASED'
      })
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
          { char: 'A', matrix: [[0, 1], [1, 0]], unicodeHex: 'U+0041' },
          { char: 'a', matrix: [[1, 1], [0, 0]], unicodeHex: 'U+0061' },
          { char: 'é', matrix: [[1, 0], [1, 0]], unicodeHex: 'U+00E9' },
          { char: '@', matrix: [[0, 0], [1, 1]], unicodeHex: 'U+0040' } 
        ],
        status: 'RELEASED' as const
      };

      const res = await orchestrator.publishFontSprite(mockFontData, validSignature as any);

      expect(res.success).toBe(true);
      expect(res.name).toBe('Canopy Sans Font');
      expect(res.slug).toBe('canopy-sans-font');
      expect(res.glyphsCount).toBe(4);
      expect(orchestratorEngine.resolveCanonicalUid).toHaveBeenCalledTimes(1);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });

    it('🔴 doit lever une erreur 404 si l\'Oiseau créateur n\'existe pas dans la Silice', async () => {
      await expect(
        orchestrator.publishFontSprite({
          uid: 'font_beta', name: 'Broken Font', slug: 'broken-font', authorUid: 'ghost', gridSize: { width: 8, height: 8 }, glyphs: []
        }, validSignature as any)
      ).rejects.toThrow(/Oiseau auteur introuvable dans la Silice/);
    });
  });
});