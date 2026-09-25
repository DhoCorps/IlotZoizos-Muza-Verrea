// Fichier : packages/types/src/__tests__/copyright.types.test.ts
import { describe, it, expect } from 'vitest';
import { CopyrightRoleSchema, CopyrightMetadataSchema } from '../core/copyright.types';

describe('Schéma Zod : Copyright & Pacte de Filiation', () => {
  describe('Validations des Rôles de Copyright', () => {
    it('valide les rôles autorisés (Créateur, Sublimateur, Curateur)', () => {
      expect(CopyrightRoleSchema.parse('CREATOR')).toBe('CREATOR');
      expect(CopyrightRoleSchema.parse('SUBLIMATOR')).toBe('SUBLIMATOR');
      expect(CopyrightRoleSchema.parse('CURATOR')).toBe('CURATOR');
      expect(() => CopyrightRoleSchema.parse('HACKER')).toThrow();
    });
  });

  describe('Validation du Copyright avec Filiation (Pacte)', () => {
    it('valide un métadonnée basique de créateur', () => {
      const result = CopyrightMetadataSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('CREATOR');
        expect(result.data.isExclusiveIlot).toBe(false);
      }
    });

    it('valide une œuvre dérivée avec une source de Filiation externe', () => {
      const payload = {
        role: 'SUBLIMATOR',
        filiation: {
          isExternalSource: true,
          sourceAuthorName: 'Mozart',
          sourceWorkTitle: 'Requiem',
          claimStatus: 'PENDING_CLAIM',
          escrowBalance: 1500
        }
      };
      
      const result = CopyrightMetadataSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.filiation?.sourceAuthorName).toBe('Mozart');
        expect(result.data.filiation?.escrowBalance).toBe(1500);
      }
    });

    it('rejette une Filiation incomplète (nom auteur source manquant)', () => {
      const invalidPayload = {
        filiation: {
          isExternalSource: true,
          sourceWorkTitle: 'Requiem'
          // Il manque sourceAuthorName
        }
      };
      const result = CopyrightMetadataSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });
});