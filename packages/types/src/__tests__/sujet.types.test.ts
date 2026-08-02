import { describe, it, expect } from 'vitest';
import { SujetSchema } from '../models/sujet.types';

describe('SujetSchema - Validation du Nœud de Pensée (tom§hat§toes)', () => {
  const validSujet = {
    uid: 'sujet-777',
    title: 'Nouveaux Modèles - Réflexion',
    slug: 'nouveaux-modeles-reflexion',
    content: 'Une pensée brute capturée pendant la composition.',
    lyrics: 'Ligne 1 des paroles...\nLigne 2...',
    copyright: '© 2026 DhÖ. Tous droits réservés.',
    authorUid: 'bird-alpha-123',
    category: 'POETRY',
    status: 'PUBLISHED',
    tags: ['musique', 'fretless'],
    connections: {
      relatedProjects: ['proj-123'],
      relatedTasks: [],
      relatedProducts: [],
      relatedGames: []
    },
    merchLink: {
      productId: 'prod_999',
      displayMode: 'card'
    },
    media: {
      coverImageUrl: 'https://cdn.ilot.io/images/cover.png',
      audioTrackUrl: 'https://cdn.ilot.io/audio/basse-fretless.mp3' 
    },
    settings: {
      allowComments: true,
      allowEmojiReactions: true,
      isAgeRestricted: false
    },
    resonance: {
      views: 42,
      readsCompleted: 12
    }
  };

  it('doit valider un Sujet complet avec ses paroles, son copyright et son lien marchand', () => {
    const result = SujetSchema.safeParse(validSujet);
    expect(result.success).toBe(true);
  });

  describe('L\'Identité Incompressible du Sujet', () => {
    it('doit rejeter un Sujet sans titre (Identité inaudible)', () => {
      const invalidTitle = { ...validSujet, title: '' };
      const result = SujetSchema.safeParse(invalidTitle);
      expect(result.success).toBe(false);
    });

    it('doit rejeter un Sujet sans contenu', () => {
      const invalidContent = { ...validSujet, content: '' };
      const result = SujetSchema.safeParse(invalidContent);
      expect(result.success).toBe(false);
    });
  });

  describe('Valeurs par défaut et État d\'Origine', () => {
    it('doit appliquer les valeurs par défaut à la naissance', () => {
      const minimalSujet = {
        uid: 'sujet-001',
        title: 'Idée furtive',
        slug: 'idee-furtive',
        content: 'Je dois creuser cette piste pour le moteur de synchro.',
        authorUid: 'bird-alpha-123'
      };

      const result = SujetSchema.parse(minimalSujet);

      expect(result.category).toBe('MONOLOGUE');
      expect(result.status).toBe('DRAFT');
      expect(result.tags).toEqual([]);
      expect(result.lyrics).toBeUndefined();
      expect(result.merchLink).toBeUndefined();
      expect(result.resonance.views).toBe(0);
    });
  });
});