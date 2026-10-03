// Fichier : packages/types/src/__tests__/partita.types.test.ts
import { describe, it, expect } from 'vitest';
import { PartitaSchema, InstrumentCategorySchema, ScoreFormatSchema } from '../models/partita.types';

describe("PartitaSchema - Validation du Modèle de Partition", () => {
  it("doit valider une partition complète avec ses options, son e-commerce, ses liaisons, son SEO, son Sceau Cryptographique et son système de commentaires", () => {
    const rawData = {
      uid: 'partita_123',
      title: 'Ligne de Basse Fretless',
      slug: 'ligne-de-basse-fretless',
      content: 'C: E1 A1 D2 G2', // 🚀 Ce contenu servira de base au hash de l'orchestrateur
      instrument: 'BASS',
      format: 'ABC',
      tuning: 'E1-A1-D2-G2',
      authorUid: 'bird_alpha',
      status: 'PUBLISHED',
      tags: ['bass', 'fretless'],
      // 🚀 Intégration du SEO
      seo: {
        metaTitle: 'Ligne de Basse Fretless - Tablature',
        metaDescription: 'Apprenez à jouer ce groove unique.'
      },
      // 🚀 Intégration du Sceau Cryptographique Unifié (avec Copyright)
      cryptoSeal: {
        digitalSignature: 'mock-sha256-hash',
        timestampedAt: new Date(),
        sealedByUid: 'bird_alpha',
        copyrightMetadata: {
          role: 'CREATOR',
          isExclusiveIlot: true,
          license: 'MIT / Libre Canopée' // 🚀 Satisfaction de Zod
        }
      },
      connections: {
        relatedProjects: ['proj_1'],
        relatedTasks: [],
        relatedProducts: [],
        relatedGames: []
      },
      merchLink: {
        productId: 'prod_bass_777',
        displayMode: 'card'
      },
      media: {
        coverImageUrl: 'https://example.com/cover.jpg',
        audioTrackUrl: 'https://example.com/audio.mp3'
      },
      // 🚀 Intégration Universal Comment
      lastCommentedAt: new Date('2026-10-03T15:30:00.000Z').toISOString()
    };

    const result = PartitaSchema.parse(rawData);
    expect(result.title).toBe('Ligne de Basse Fretless');
    expect(result.slug).toBe('ligne-de-basse-fretless');
    expect(result.instrument).toBe('BASS');
    expect(result.seo?.metaTitle).toBe('Ligne de Basse Fretless - Tablature');
    expect(result.cryptoSeal?.digitalSignature).toBeDefined();
    expect(result.cryptoSeal?.copyrightMetadata?.role).toBe('CREATOR');
    expect(result.lastCommentedAt).toBeDefined(); // 🚀 Vérifie que le champ de commentaire est bien accepté
  });

  it("doit appliquer les valeurs par défaut à la naissance", () => {
    const minimalData = {
      uid: 'partita_min',
      title: 'Idée de Riff',
      slug: 'idee-de-riff',
      content: 'G2 D2 A1 E1',
      authorUid: 'bird_alpha'
    };

    const result = PartitaSchema.parse(minimalData);
    expect(result.slug).toBe('idee-de-riff');
    expect(result.instrument).toBe('BASS');
    expect(result.format).toBe('ABC');
    expect(result.seo).toBeDefined(); // Valeur par défaut instanciée
    expect(result.cryptoSeal).toBeUndefined(); // Optionnel par défaut
    expect(result.lastCommentedAt).toBeUndefined(); // Optionnel à la création
  });

  it("doit rejeter une partition sans slug, titre ou contenu", () => {
    const invalidData = {
      uid: 'partita_invalid',
    };

    expect(() => PartitaSchema.parse(invalidData)).toThrow();
  });
});