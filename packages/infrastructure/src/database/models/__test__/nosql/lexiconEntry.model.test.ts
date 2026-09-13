// src/models/__tests__/LexiconEntry.test.ts
import { describe, it, expect } from 'vitest';
import { LexiconEntryModel } from '../../nosql/lexiconEntry.model';

describe('LexiconEntry Model Validation', () => {
  it('should successfully validate a correct lexicon entry', () => {
    const validData = {
      uid: 'lex_fr_oiseau',
      languageCode: 'fr',
      word: 'oiseau',
      phoneticIpa: '/wa.zo/',
      syllableCount: 2,
      definitions: {
        fr: 'Animal vertébré à plumes.',
        en: 'A feathered vertebrate animal.'
      },
      partOfSpeech: 'noun'
    };

    const entry = new LexiconEntryModel(validData);
    const validationError = entry.validateSync();
    
    expect(validationError).toBeUndefined();
    expect(entry.uid).toBe('lex_fr_oiseau');
    expect(entry.syllableCount).toBe(2);
    expect(entry.definitions['fr']).toBe('Animal vertébré à plumes.');
  });

  it('should fail if required fields are missing', () => {
    const invalidData = {
      languageCode: 'fr',
      syllableCount: 1
    };

    const entry = new LexiconEntryModel(invalidData);
    const validationError = entry.validateSync();

    expect(validationError).toBeDefined();
    expect(validationError?.errors.uid).toBeDefined();
    expect(validationError?.errors.word).toBeDefined();
  });
});