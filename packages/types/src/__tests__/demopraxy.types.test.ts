import { describe, it, expect } from 'vitest';
import { SanctionCategorySchema, IDemopraxicRecord, DemopraxyPaginationQuery } from '../core/demopraxy.types';

describe('Contrats et Schémas : Démopraxy Types', () => {
  it('🟢 doit valider correctement les catégories de sanctions autorisées via Zod', () => {
    expect(SanctionCategorySchema.parse('SYSTEMIC_HATRED')).toBe('SYSTEMIC_HATRED');
    expect(SanctionCategorySchema.parse('TOXICITY')).toBe('TOXICITY');
    expect(SanctionCategorySchema.parse('HARASSMENT')).toBe('HARASSMENT');
    
    const invalidParse = SanctionCategorySchema.safeParse('UNKNOWN_VIOLATION');
    expect(invalidParse.success).toBe(false);
  });

  it('🟢 doit structurer un enregistrement d’exclusion conforme à IDemopraxicRecord', () => {
    const record: IDemopraxicRecord = {
      uid: 'demo_rec_001',
      userIdentifier: 'bird_rebel_99',
      actorUid: 'bird_guardian_alpha',
      metrics: {
        systemicHatredScore: 8.5,
        recurrenceCount: 4,
        recalibrationCapacity: 1.2,
        collectiveResonance: 3.0,
        computedEx: 28.33
      },
      sanctionCategory: 'SYSTEMIC_HATRED',
      tags: ['toxique', 'récidiviste', 'exclusion'],
      isExcluded: true,
      actionMessage: 'Sanctuaire Isolé par stase démopraxique.',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    expect(record.uid).toBe('demo_rec_001');
    expect(record.metrics.computedEx).toBeGreaterThan(15.0);
    expect(record.isExcluded).toBe(true);
    expect(record.tags).toContain('toxique');
  });

  it('🟢 doit valider le contrat de pagination et de filtrage DemopraxyPaginationQuery', () => {
    const query: DemopraxyPaginationQuery = {
      page: 2,
      limit: 10,
      sanctionCategory: 'TOXICITY',
      tag: 'récidiviste',
      isExcluded: true
    };

    expect(query.page).toBe(2);
    expect(query.limit).toBe(10);
    expect(query.sanctionCategory).toBe('TOXICITY');
    expect(query.tag).toBe('récidiviste');
    expect(query.isExcluded).toBe(true);
  });
});