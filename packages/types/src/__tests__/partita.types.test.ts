import { describe, it, expect } from 'vitest';
import { PartitaSchema, InstrumentCategorySchema, ScoreFormatSchema } from '../models/partita.types';

describe("PartitaSchema - Validation du Modèle de Partition", () => {
  it("doit valider une partition complète avec ses options, son e-commerce et ses liaisons", () => {
    const rawData = {
      uid: 'partita_123',
      title: 'Ligne de Basse Fretless',
      slug: 'ligne-de-basse-fretless',
      content: 'C: E1 A1 D2 G2',
      instrument: 'BASS',
      format: 'ABC',
      tuning: 'E1-A1-D2-G2',
      authorUid: 'bird_alpha',
      status: 'PUBLISHED',
      tags: ['bass', 'fretless'],
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
      }
    };

    const result = PartitaSchema.parse(rawData);
    expect(result.title).toBe('Ligne de Basse Fretless');
    expect(result.slug).toBe('ligne-de-basse-fretless');
    expect(result.instrument).toBe('BASS');
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
  });

  it("doit rejeter une partition sans slug, titre ou contenu", () => {
    const invalidData = {
      uid: 'partita_invalid',
    };

    expect(() => PartitaSchema.parse(invalidData)).toThrow();
  });
});