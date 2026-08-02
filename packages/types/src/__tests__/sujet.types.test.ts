// packages/types/src/__tests__/sujet.types.test.ts
import { describe, it, expect } from 'vitest';
import { SujetSchema } from '../models/sujet.types';

describe('SujetSchema - Validation du Nœud de Pensée (tom§hat§toes)', () => {
  // Un Sujet complet avec tous ses ancrages
  const validSujet = {
    uid: 'sujet-777',
    title: 'Nouveaux Modèles - Réflexion',
    slug: 'nouveaux-modeles-reflexion',
    content: 'Une pensée brute capturée pendant la composition.',
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
    media: {
      coverImageUrl: 'https://cdn.ilot.io/images/cover.png',
      // Suture pour tes pistes de multi-pistes (basse, synthé...)
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

  it('doit valider un Sujet complet avec toutes ses connexions', () => {
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

    it('doit rejeter un format d\'URL invalide pour les médias', () => {
      const invalidMedia = {
        ...validSujet,
        media: { audioTrackUrl: 'ceci-nest-pas-une-frequence-audio' }
      };
      const result = SujetSchema.safeParse(invalidMedia);
      expect(result.success).toBe(false);
    });
  });

  describe('Valeurs par défaut et État d\'Origine', () => {
    it('doit appliquer les valeurs par défaut (MONOLOGUE, DRAFT, connexions vides) à la naissance', () => {
      // Un brouillon minimaliste jeté dans le flux
      const minimalSujet = {
        uid: 'sujet-001',
        title: 'Idée furtive',
        slug: 'idee-furtive',
        content: 'Je dois creuser cette piste pour le moteur de synchro.',
        authorUid: 'bird-alpha-123'
      };

      const result = SujetSchema.parse(minimalSujet);

      // Vérification des constantes philosophiques et techniques
      expect(result.category).toBe('MONOLOGUE');
      expect(result.status).toBe('DRAFT');
      
      // Vérification des structures par défaut
      expect(result.tags).toEqual([]);
      expect(result.connections.relatedProjects).toEqual([]);
      expect(result.connections.relatedTasks).toEqual([]);
      
      // Vérification de la gouvernance et de la résonance
      expect(result.settings.allowComments).toBe(true);
      expect(result.resonance.views).toBe(0);
      expect(result.resonance.readsCompleted).toBe(0);
    });
  });
});