import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LetrinSpriteOrchestrator } from '../letrinSprite.orchestrator';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';
import { ActionSignature, TypographicCategoryEnum } from '@ilot/types';
import * as orchestratorEngine from '../../utils/orchestrator.engine';
import { LetrinFontSpriteModel } from '@ilot/infrastructure';
import type { ClientSession } from 'mongoose';
import type { Transaction } from 'neo4j-driver';

// 🛡️ 1. Mock synchrone pur de l'Infrastructure
vi.mock('@ilot/infrastructure', () => ({
  OiseauModel: {},
  LetrinFontSpriteModel: {
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

// 🛡️ 3. Mock de la transaction unifiée
vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (_name: string, cb: (mongoSession: ClientSession, neo4jTx: Transaction) => Promise<unknown>) => 
      cb({} as ClientSession, { run: vi.fn().mockResolvedValue({ records: [{ get: (key: string) => {
        if (key === 'f') return { properties: { uid: 'font_alpha', name: 'Canopy Sans' } };
        if (key === 'connections') return [{ target: { properties: { uid: 'blog_1', title: 'Manifeste' }, labels: ['Blog'] }, rel: 'USED_IN' }];
        return 'font_1';
      }}] }) } as unknown as Transaction)
    ),
  },
}));

describe('LetrinSpriteOrchestrator - Forge Alchimique Letr\'in', () => {
  let orchestrator: LetrinSpriteOrchestrator;
  const validSignature: ActionSignature = { actorUid: 'bird_typographer', capabilities: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new LetrinSpriteOrchestrator();

    vi.mocked(LetrinFontSpriteModel.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        uid: 'font_alpha',
        name: 'Canopy Sans Font',
        slug: 'canopy-sans-font',
        authorUid: 'bird_typographer',
        category: TypographicCategoryEnum.LINEALE,
        frequencyHz: 432,
        gridSize: { width: 16, height: 16 },
        glyphs: [],
        status: 'RELEASED'
      })
    } as any);
  });

  describe('publishFontSprite (Publication Unifiée)', () => {
    it('🔴 doit rejeter (401) si l\'Oiseau n\'est pas authentifié', async () => {
      await expect(
        orchestrator.publishFontSprite({
          uid: 'f1', name: 'Pixel Font', slug: 'pixel-font', authorUid: 'b1', gridSize: { width: 8, height: 8 }, glyphs: []
        }, { capabilities: [] } as any)
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit sédimenter la création, inclure la taxonomie et générer le Sceau Cryptographique (SHA-256)', async () => {
      const mockFontData = {
        uid: 'font_alpha',
        name: 'Canopy Sans Font',
        slug: 'canopy-sans-font',
        authorUid: 'bird_typographer',
        category: TypographicCategoryEnum.LINEALE,
        tags: ['minimal', 'propre'],
        frequencyHz: 528, // Fréquence personnalisée
        gridSize: { width: 16, height: 16 },
        glyphs: [
          { character: 'A', frames: [{ frameIndex: 0, width: 16, height: 16, pixels: [] }], advanceWidth: 16 },
        ],
        status: 'RELEASED' as const
      };

      const res = await orchestrator.publishFontSprite(mockFontData, validSignature as any);

      expect(res.success).toBe(true);
      expect(res.name).toBe('Canopy Sans Font');
      expect(res.glyphsCount).toBe(1);
      // Le sceau doit être un hash hexadécimal généré par crypto
      expect(res.digitalSignature).toBeDefined();
      expect(typeof res.digitalSignature).toBe('string');
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('getFontConstellationGraph (Extraction Graphe)', () => {
    it('🟢 doit récupérer et formatter correctement les nœuds et liens pour Constellation3D', async () => {
      const graphData = await orchestrator.getFontConstellationGraph('font_alpha') as any;
      
      expect(graphData.nodes).toBeDefined();
      expect(graphData.links).toBeDefined();
      // Doit inclure la police (FONT) et le contenu connecté (BLOG)
      expect(graphData.nodes).toContainEqual(expect.objectContaining({ type: 'FONT', id: 'font_alpha' }));
      expect(graphData.nodes).toContainEqual(expect.objectContaining({ type: 'BLOG', id: 'blog_1' }));
      expect(graphData.links).toContainEqual(expect.objectContaining({ source: 'font_alpha', target: 'blog_1', type: 'USED_IN' }));
    });
  });
});