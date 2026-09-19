import { describe, it, expect } from 'vitest';
import { SujetSchema, SujetCategorySchema, SujetStatusSchema } from '../models/sujet.types';

describe('Schéma Zod : SujetSchema & Énumérations (DRY Edition)', () => {
  
  describe('Validations des Énumérations', () => {
    it('valide les catégories autorisées', () => {
      expect(SujetCategorySchema.parse('MONOLOGUE')).toBe('MONOLOGUE');
      expect(SujetCategorySchema.parse('MANIFESTO')).toBe('MANIFESTO');
      expect(() => SujetCategorySchema.parse('INCONNU')).toThrow();
    });

    it('valide les statuts autorisés', () => {
      expect(SujetStatusSchema.parse('DRAFT')).toBe('DRAFT');
      expect(SujetStatusSchema.parse('PUBLISHED')).toBe('PUBLISHED');
      expect(() => SujetStatusSchema.parse('DELETED')).toThrow();
    });
  });

  describe('Validation du Schéma Principal (SujetSchema)', () => {
    
    const validBaseSujet = {
      uid: 'sujet-uuid-123',
      title: 'Chronique des Profondeurs',
      slug: 'chronique-des-profondeurs',
      content: 'Ceci est le corps du texte de test...',
      authorUid: 'oiseau-uid-789'
    };

    it('valide un sujet minimal avec les valeurs par défaut', () => {
      const result = SujetSchema.safeParse(validBaseSujet);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.category).toBe('MONOLOGUE');
        expect(result.data.status).toBe('DRAFT');
        expect(result.data.readingTimeMinutes).toBe(1);
        expect(result.data.seo.metaDescription).toBeUndefined();
        expect(result.data.connections.crossLinks).toEqual([]);
      }
    });

    it('rejète un sujet si les champs obligatoires manquent', () => {
      expect(SujetSchema.safeParse({ ...validBaseSujet, title: '' }).success).toBe(false);
      expect(SujetSchema.safeParse({ ...validBaseSujet, slug: '' }).success).toBe(false);
      expect(SujetSchema.safeParse({ ...validBaseSujet, content: '' }).success).toBe(false);
    });

    it('rejète une URL canonique invalide via le schéma partagé SEO', () => {
      const invalidCanonical = {
        ...validBaseSujet,
        seo: { canonicalUrl: 'ce-n-est-pas-une-url' }
      };
      expect(SujetSchema.safeParse(invalidCanonical).success).toBe(false);
    });

    it('valide un sujet enrichi utilisant les briques mutualisées (SEO, CrossLinks, Médias)', () => {
      const completeSujet = {
        ...validBaseSujet,
        subtitle: 'Une exploration des flux asynchrones',
        excerpt: 'Résumé court pour les cartes du flux.',
        publishedAt: '2026-06-06T12:00:00.000Z',
        readingTimeMinutes: 3,
        seo: {
          metaTitle: 'Chronique des Profondeurs | Îlot',
          metaDescription: 'Plonge dans ce monologue inédit au cœur de l’Îlot Zoizos.',
          canonicalUrl: 'https://ilot-zoizos.com/abyss-blog/chronique-des-profondeurs'
        },
        connections: {
          relatedProjects: [],
          relatedTasks: [],
          relatedProducts: [],
          relatedGames: [],
          crossLinks: [
            { entityType: 'FONT', entityId: 'font-1', label: 'Police Letr\'In' }
          ]
        },
        media: {
          coverImageUrl: 'https://cdn.ilot/cover.jpg',
          coverImageAlt: 'Illustration cybernétique'
        }
      };

      const result = SujetSchema.safeParse(completeSujet);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.connections.crossLinks).toHaveLength(1);
        expect(result.data.seo.canonicalUrl).toBeDefined();
        expect(result.data.media?.coverImageAlt).toBeDefined();
      }
    });

  });
});