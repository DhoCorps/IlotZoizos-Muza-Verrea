import { describe, it, expect } from 'vitest';
import { SeoMetadataSchema, CrossLinkSchema, SharedMediaSchema } from '../core/seo.types';

describe('Schémas Partagés : SEO, CrossLinks & Médias (DRY Architecture)', () => {
  
  describe('SeoMetadataSchema', () => {
    it('🟢 valide un bloc SEO vide ou partiellement rempli', () => {
      const result = SeoMetadataSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('🟢 valide un bloc SEO complet enrichi pour les ouvrages (OpenGraph Book)', () => {
      const validSeo = {
        metaTitle: 'Titre de test SEO (60 car max)',
        metaDescription: 'Ceci est une description optimisée pour le moteur de recherche Google se situant entre 150 et 160 caractères.',
        ogImageUrl: 'https://cdn.ilot/og-image.jpg',
        canonicalUrl: 'https://ilot-zoizos.com/ma-page',
        ogType: 'book',
        articleAuthor: 'Oiseau_Plume',
        publishedTime: new Date().toISOString()
      };
      const result = SeoMetadataSchema.safeParse(validSeo);
      expect(result.success).toBe(true);
    });

    it('🔴 rejète un metaTitle trop long (> 60 caractères)', () => {
      const invalidSeo = {
        metaTitle: 'Ceci est un titre beaucoup trop long qui dépasse largement la limite autorisée par les moteurs de recherche'
      };
      const result = SeoMetadataSchema.safeParse(invalidSeo);
      expect(result.success).toBe(false);
    });

    it('🔴 rejète une URL canonique malformée', () => {
      const invalidSeo = {
        canonicalUrl: 'ce-nest-pas-une-url-valide'
      };
      const result = SeoMetadataSchema.safeParse(invalidSeo);
      expect(result.success).toBe(false);
    });
  });

  describe('CrossLinkSchema (Le Graphe)', () => {
    it('🟢 valide un lien croisé valide vers une autre entité', () => {
      const validLink = {
        entityType: 'FONT',
        entityId: 'font-uuid-999',
        label: 'Découvrir la police Letr\'In'
      };
      const result = CrossLinkSchema.safeParse(validLink);
      expect(result.success).toBe(true);
    });

    it('🔴 rejète un entityType non reconnu par la taxonomie de l\'Îlot', () => {
      const invalidLink = {
        entityType: 'UNKNOWN_MODULE',
        entityId: '123'
      };
      const result = CrossLinkSchema.safeParse(invalidLink);
      expect(result.success).toBe(false);
    });
  });

  describe('SharedMediaSchema', () => {
    it('🟢 valide un objet média avec accessibilité SEO', () => {
      const validMedia = {
        coverImageUrl: 'https://cdn.ilot/cover.png',
        coverImageAlt: 'Schéma vectoriel du graphe Neo4j',
        audioTrackUrl: 'https://cdn.ilot/audio.mp3',
        audioTitle: 'Ambiance Abyssale'
      };
      const result = SharedMediaSchema.safeParse(validMedia);
      expect(result.success).toBe(true);
    });
  });
});