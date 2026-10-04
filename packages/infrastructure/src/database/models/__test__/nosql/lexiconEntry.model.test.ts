// packages/infrastructure/src/database/models/__test__/nosql/lexiconEntry.model.test.ts
import { describe, it, expect } from 'vitest';
import { LexiconEntryModel } from '../../nosql/lexiconEntry.model';

describe('LexiconEntry Model Validation', () => {
  it('🟢 doit valider avec succès une entrée lexicale complète', () => {
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
      partOfSpeech: 'noun',
      rhymesWith: [
        { targetUid: 'lex_fr_roseau', type: 'rich', match: '95%' }
      ],
      translations: []
    };

    const entry = new LexiconEntryModel(validData);
    const validationError = entry.validateSync();
    
    expect(validationError).toBeUndefined();
    expect(entry.uid).toBe('lex_fr_oiseau');
    expect(entry.syllableCount).toBe(2);
    
    // Le Record<string, string> de Zod passe parfaitement dans le Schema.Types.Mixed
    expect(entry.definitions['fr']).toBe('Animal vertébré à plumes.');
    expect(entry.rhymesWith[0].targetUid).toBe('lex_fr_roseau');
  });

  it('🔴 doit échouer si des champs requis (uid, word, phoneticIpa) sont manquants', () => {
    const invalidData = {
      languageCode: 'fr',
      syllableCount: 1
    };

    const entry = new LexiconEntryModel(invalidData);
    const validationError = entry.validateSync();

    expect(validationError).toBeDefined();
    expect(validationError?.errors.uid).toBeDefined();
    expect(validationError?.errors.word).toBeDefined();
    expect(validationError?.errors.phoneticIpa).toBeDefined();
  });
});