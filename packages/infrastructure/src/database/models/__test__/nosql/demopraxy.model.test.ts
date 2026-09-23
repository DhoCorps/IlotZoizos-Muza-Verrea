import { describe, it, expect } from 'vitest';
import { DemopraxyModel } from '../../nosql/demopraxy.model';

describe('DemopraxyModel (Persistance Mongoose & Registre de Justice)', () => {
  it('🟢 doit valider un enregistrement démopraxique conforme avec ses valeurs par défaut', () => {
    const validData = {
      uid: 'demo_rec_123',
      userIdentifier: 'bird_bad_1',
      actorUid: 'bird_guardian_1',
      metrics: {
        systemicHatredScore: 9.0,
        recurrenceCount: 5,
        recalibrationCapacity: 1.0,
        collectiveResonance: 2.0,
        computedEx: 45.0
      },
      sanctionCategory: 'SYSTEMIC_HATRED',
      tags: ['toxique', 'banni'],
      isExcluded: true,
      actionMessage: 'Sanctuaire Isolé par stase démopraxique.'
    };

    const record = new DemopraxyModel(validData);
    const validationError = record.validateSync();

    expect(validationError).toBeUndefined();
    expect(record.uid).toBe('demo_rec_123');
    expect(record.sanctionCategory).toBe('SYSTEMIC_HATRED');
    expect(record.isExcluded).toBe(true);
    expect(record.tags).toContain('toxique');
  });

  it('🔴 doit échouer si les champs obligatoires (uid, actorUid, metrics, actionMessage) manquent', () => {
    const invalidData = {
      userIdentifier: 'bird_bad_1'
    };

    const record = new DemopraxyModel(invalidData);
    const validationError = record.validateSync();

    expect(validationError).toBeDefined();
    expect(validationError?.errors.uid).toBeDefined();
    expect(validationError?.errors.actorUid).toBeDefined();
    // Mongoose signale l'absence des champs requis à l'intérieur de l'objet imbriqué
    expect(validationError?.errors['metrics.systemicHatredScore']).toBeDefined();
    expect(validationError?.errors['metrics.recurrenceCount']).toBeDefined();
    expect(validationError?.errors.actionMessage).toBeDefined();
  });

  it('🔴 doit rejeter une catégorie de sanction non reconnue par l\'énumération Zod/Mongoose', () => {
    const invalidCategoryData = {
      uid: 'demo_rec_456',
      userIdentifier: 'bird_bad_2',
      actorUid: 'bird_guardian_1',
      metrics: {
        systemicHatredScore: 2.0,
        recurrenceCount: 1,
        recalibrationCapacity: 5.0,
        collectiveResonance: 5.0,
        computedEx: 2.0
      },
      sanctionCategory: 'INVALID_CATEGORY',
      actionMessage: 'Test de stase'
    };

    const record = new DemopraxyModel(invalidCategoryData);
    const validationError = record.validateSync();

    expect(validationError).toBeDefined();
    expect(validationError?.errors.sanctionCategory).toBeDefined();
  });
});