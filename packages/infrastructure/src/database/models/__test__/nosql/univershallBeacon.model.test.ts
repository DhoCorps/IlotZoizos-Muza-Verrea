// src/models/__tests__/UniversHallBeacon.test.ts

import { describe, it, expect } from 'vitest';
import { UniversHallBeaconModel } from '../../nosql/univershallBeacon.model';

describe('UniversHallBeacon Model Validation', () => {
  it('doit valider avec succès une balise d\'Agora correcte', () => {
    const validData = {
      uid: 'beacon_poet_123',
      sourceModule: 'POETRIK',
      entityUid: 'lex_fr_oiseau',
      title: 'Le Chant des Nuages',
      slug: 'le-chant-des-nuages',
      authorUid: 'bird_alpha',
      authorSlug: 'bird-alpha',
      summary: 'Un poème sur les hauteurs de la canopée.',
      tags: ['poesie', 'ciel', 'vibration'],
      resonanceScore: 42,
      metadata: { syllableCount: 12 }
    };

    const beacon = new UniversHallBeaconModel(validData);
    const validationError = beacon.validateSync();

    expect(validationError).toBeUndefined();
    expect(beacon.uid).toBe('beacon_poet_123');
    expect(beacon.sourceModule).toBe('POETRIK');
    expect(beacon.resonanceScore).toBe(42);
    expect(beacon.tags).toContain('poesie');
  });

  it('doit rejeter la balise si les champs requis (uid, sourceModule, title, slug) manquent', () => {
    const invalidData = {
      summary: 'Balise incomplète'
    };

    const beacon = new UniversHallBeaconModel(invalidData);
    const validationError = beacon.validateSync();

    expect(validationError).toBeDefined();
    expect(validationError?.errors.uid).toBeDefined();
    expect(validationError?.errors.sourceModule).toBeDefined();
    expect(validationError?.errors.title).toBeDefined();
    expect(validationError?.errors.slug).toBeDefined();
  });

  it('doit rejeter un module source invalide non répertorié sur l\'Agora', () => {
    const invalidModuleData = {
      uid: 'beacon_bad_123',
      sourceModule: 'MODULE_INCONNU',
      entityUid: 'ent_1',
      title: 'Titre',
      slug: 'titre-errone',
      authorUid: 'bird_1',
      authorSlug: 'bird-1'
    };

    const beacon = new UniversHallBeaconModel(invalidModuleData);
    const validationError = beacon.validateSync();

    expect(validationError).toBeDefined();
    expect(validationError?.errors.sourceModule).toBeDefined();
  });
});