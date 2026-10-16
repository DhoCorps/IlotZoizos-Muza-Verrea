// Fichier : packages/types/src/__tests__/common.types.test.ts
import { describe, it, expect } from 'vitest';
import {
  STATUS_CONFIG,
  EntityTargetEnum,
  EntityTargetSchema,
  BaseNodeSchema,
  MerchLinkSchema,
  ProjectPrioritySchema,
  ComplexityLevelSchema
} from '../models/common.types';
import { ProjectStatusSchema } from '../models/project.types';

describe('Socle SSOT : common.types.ts & EntityTargetEnum', () => {
  it('🟢 doit valider toutes les entités métier dans EntityTargetEnum', () => {
    const businessEntities = [
      'USER', 'TEAM', 'PROJECT', 'TASK', 'FRAGMENT', 'SUJET', 'ARTICLE', 'BLOG',
      'COMMENT', 'PRODUCT', 'STORE', 'SHOP', 'ORDER', 'BARTER', 'PARTITA', 'SAMPLE',
      'FONT', 'SPRITE', 'BOOK', 'POEM', 'QUEST', 'PROFILE', 'TEMPLATE', 'KONTRAKT',
      'SUBSIDY', 'RAFFLE', 'MESSAGE', 'TAG'
    ];

    for (const entity of businessEntities) {
      const result = EntityTargetEnum.safeParse(entity);
      expect(result.success).toBe(true);
    }
  });

  it('🟢 doit valider tous les modules sources (rétrocompatibilité SourceAppEnum & CrossLinks)', () => {
    const sourceModules = [
      'ABYSS', 'BIBLIOTEK', 'POETRIK', 'SAMPLOTEK', 'LETRIN',
      'KONTAKT', 'DHO', 'GALLERY', 'GAME', 'LYRIKA', 'UNKNOWN'
    ];

    for (const mod of sourceModules) {
      const result = EntityTargetSchema.safeParse(mod);
      expect(result.success).toBe(true);
    }
  });

  it('🔴 doit rejeter une cible d’entité inconnue ou invalide', () => {
    const invalidResult = EntityTargetEnum.safeParse('INTRUS_MATRICIEL');
    expect(invalidResult.success).toBe(false);
  });

  it('🟢 doit conserver le fonctionnement de BaseNodeSchema, MerchLinkSchema et des schémas globaux', () => {
    const node = BaseNodeSchema.parse({
      uid: 'node_123',
      createdAt: new Date().toISOString()
    });
    expect(node.uid).toBe('node_123');

    const merch = MerchLinkSchema.parse({ productId: 'prod_001' });
    expect(merch.displayMode).toBe('card');

    expect(ProjectStatusSchema.safeParse('IN_PROGRESS').success).toBe(true);
    expect(ProjectPrioritySchema.safeParse('CRITICAL').success).toBe(true);
    expect(ComplexityLevelSchema.parse(undefined)).toBe(1);
    expect(ComplexityLevelSchema.safeParse(15).success).toBe(false);
    expect(STATUS_CONFIG.DONE.color).toBe('green');
  });
});