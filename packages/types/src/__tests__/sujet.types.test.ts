import { describe, it, expect } from 'vitest';
import { SujetSchema, SujetCategorySchema, SujetStatusSchema, CopyrightRoleSchema } from '../models/sujet.types';

describe('Schéma Zod : SujetSchema & Copyright (DRY Edition)', () => {
  
  describe('Validations des Énumérations & Copyright', () => {
    it('valide les catégories autorisées', () => {
      expect(SujetCategorySchema.parse('MONOLOGUE')).toBe('MONOLOGUE');
      expect(SujetCategorySchema.parse('MANIFESTO')).toBe('MANIFESTO');
      expect(() => SujetCategorySchema.parse('INCONNU')).toThrow();
    });

    it('valide les rôles de copyright autorisés (Créateur, Sublimateur, Curateur)', () => {
      expect(CopyrightRoleSchema.parse('CREATOR')).toBe('CREATOR');
      expect(CopyrightRoleSchema.parse('SUBLIMATOR')).toBe('SUBLIMATOR');
      expect(CopyrightRoleSchema.parse('CURATOR')).toBe('CURATOR');
      expect(() => CopyrightRoleSchema.parse('HACKER')).toThrow();
    });
  });

  describe('Validation du Schéma Principal avec Copyright Sublimé', () => {
    const validBaseSujet = {
      uid: 'sujet-uuid-123',
      title: 'Chronique des Profondeurs',
      slug: 'chronique-des-profondeurs',
      content: 'Ceci est le corps du texte de test...',
      authorUid: 'oiseau-uid-789'
    };

    it('valide un sujet avec les métadonnées de copyright par défaut', () => {
      const result = SujetSchema.safeParse(validBaseSujet);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.copyrightMetadata.role).toBe('CREATOR');
        expect(result.data.copyrightMetadata.isExclusiveIlot).toBe(false);
      }
    });

    it('valide un sujet avec un rôle de Sublimateur et une exclusivité Îlot active', () => {
      const sublimatedSujet = {
        ...validBaseSujet,
        copyrightMetadata: {
          role: 'SUBLIMATOR',
          originalAuthor: 'Georges Brassens',
          originalWorkTitle: 'Les Copains d abord',
          sublimationNotes: 'Arrangement acoustique en ré mineur',
          isExclusiveIlot: true
        }
      };

      const result = SujetSchema.safeParse(sublimatedSujet);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.copyrightMetadata.role).toBe('SUBLIMATOR');
        expect(result.data.copyrightMetadata.originalAuthor).toBe('Georges Brassens');
        expect(result.data.copyrightMetadata.isExclusiveIlot).toBe(true);
      }
    });
  });
});