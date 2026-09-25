// Fichier : packages/types/src/__tests__/sujet.types.test.ts
import { describe, it, expect } from 'vitest';
import { SujetSchema, SujetCategorySchema } from '../models/sujet.types';

describe('Schéma Zod : SujetSchema (DRY Edition)', () => {
  
  describe('Validations des Catégories', () => {
    it('valide les catégories autorisées', () => {
      expect(SujetCategorySchema.parse('MONOLOGUE')).toBe('MONOLOGUE');
      expect(SujetCategorySchema.parse('MANIFESTO')).toBe('MANIFESTO');
      expect(() => SujetCategorySchema.parse('INCONNU')).toThrow();
    });
  });

  describe('Validation du Schéma Principal avec Intégration Copyright', () => {
    const validBaseSujet = {
      uid: 'sujet-uuid-123',
      title: 'Chronique des Profondeurs',
      slug: 'chronique-des-profondeurs',
      content: 'Ceci est le corps du texte de test...',
      authorUid: 'oiseau-uid-789'
    };

    it('valide un sujet avec les métadonnées de copyright injectées par défaut', () => {
      const result = SujetSchema.safeParse(validBaseSujet);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.copyrightMetadata.role).toBe('CREATOR');
        expect(result.data.copyrightMetadata.isExclusiveIlot).toBe(false);
      }
    });

    it('valide un sujet avec un rôle de Sublimateur et un Pacte de Filiation initié', () => {
      const sublimatedSujet = {
        ...validBaseSujet,
        copyrightMetadata: {
          role: 'SUBLIMATOR',
          originalAuthor: 'Georges Brassens',
          filiation: {
            isExternalSource: true,
            sourceAuthorName: 'Georges Brassens',
            sourceWorkTitle: 'Les Copains d abord',
            claimStatus: 'PENDING_CLAIM',
            escrowBalance: 0
          }
        }
      };

      const result = SujetSchema.safeParse(sublimatedSujet);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.copyrightMetadata.filiation?.sourceAuthorName).toBe('Georges Brassens');
        expect(result.data.copyrightMetadata.filiation?.claimStatus).toBe('PENDING_CLAIM');
      }
    });
  });
});