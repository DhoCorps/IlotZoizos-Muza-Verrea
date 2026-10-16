// packages/types/src/__tests__/lexicon.types.test.ts
import { describe, it, expect } from 'vitest';
import { LexiconEntrySchema, RhymeQueryOptionsSchema } from '../../src/models/lexicon.types';

describe('Types : Lexicon (Fusion Zod/TS)', () => {
  it('🟢 doit valider une entrée lexicale avec des définitions multilingues et coercer les dates', () => {
    const isoDate = "2026-10-16T15:08:00.000Z";
    const entry = {
      languageCode: 'sjn',
      word: 'elbereth',
      phoneticIpa: '/ɛl.bɛ.rɛθ/',
      syllableCount: 3,
      partOfSpeech: 'magic',
      definitions: { fr: 'Reine des étoiles', en: 'Star Queen' },
      createdAt: isoDate, // ⏳ Ajout d'une date en format string ISO
      updatedAt: isoDate
    };

    const result = LexiconEntrySchema.safeParse(entry);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.definitions.fr).toBe('Reine des étoiles');
      expect(result.data.createdAt).toBeInstanceOf(Date); // ⏳ Vérification du z.coerce.date()
      expect(result.data.createdAt?.toISOString()).toBe(isoDate);
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