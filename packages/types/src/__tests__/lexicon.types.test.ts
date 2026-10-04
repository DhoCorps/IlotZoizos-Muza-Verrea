// packages/types/src/__tests__/lexicon.types.test.ts
import { describe, it, expect } from 'vitest';
import { LexiconEntrySchema, RhymeQueryOptionsSchema } from '../../src/models/lexicon.types';

describe('Types : Lexicon (Fusion Zod/TS)', () => {
  it('🟢 doit valider une entrée lexicale avec des définitions multilingues', () => {
    const entry = {
      languageCode: 'sjn',
      word: 'elbereth',
      phoneticIpa: '/ɛl.bɛ.rɛθ/',
      syllableCount: 3,
      partOfSpeech: 'magic',
      definitions: { fr: 'Reine des étoiles', en: 'Star Queen' }
    };

    const result = LexiconEntrySchema.safeParse(entry);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.definitions.fr).toBe('Reine des étoiles');
    }
  });

  it('🔴 doit rejeter une requête de rimes invalide (sans langue)', () => {
    const query = {
      rhymeType: 'rich',
      limit: 10
    };

    const result = RhymeQueryOptionsSchema.safeParse(query);
    expect(result.success).toBe(false);
  });

  it('🟢 doit appliquer les valeurs par défaut aux options de rimes', () => {
    const query = { languageCode: 'fr' };
    const result = RhymeQueryOptionsSchema.safeParse(query);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(30); // Limite par défaut appliquée
    }
  });
});