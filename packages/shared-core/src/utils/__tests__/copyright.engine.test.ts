import { describe, it, expect } from 'vitest';
import { sanitizeCopyright, getCopyrightCypherRelation } from '../copyright.engine';

describe('Copyright Engine (DRY & Règles Métiers)', () => {
  describe('sanitizeCopyright', () => {
    it('🟢 doit renvoyer les valeurs par défaut (CREATOR, non exclusif) si aucun payload n\'est fourni', () => {
      const result = sanitizeCopyright(undefined);
      expect(result.role).toBe('CREATOR');
      expect(result.isExclusiveIlot).toBe(false);
    });

    it('🟢 doit conserver l\'exclusivité Îlot pour un Créateur ou un Sublimateur', () => {
      const result = sanitizeCopyright({ role: 'SUBLIMATOR', isExclusiveIlot: true });
      expect(result.role).toBe('SUBLIMATOR');
      expect(result.isExclusiveIlot).toBe(true);
    });

    it('🔴 doit écraser l\'exclusivité Îlot et la forcer à false si le rôle est CURATOR', () => {
      const result = sanitizeCopyright({ role: 'CURATOR', isExclusiveIlot: true });
      expect(result.role).toBe('CURATOR');
      expect(result.isExclusiveIlot).toBe(false); // La sécurité a agi
    });

    it('🟢 doit nettoyer les espaces (trim) des chaînes de caractères textuelles', () => {
      const result = sanitizeCopyright({ 
        role: 'SUBLIMATOR', 
        originalAuthor: '   Georges Brassens   ',
        sublimationNotes: '  Arrangement  '
      });
      expect(result.originalAuthor).toBe('Georges Brassens');
      expect(result.sublimationNotes).toBe('Arrangement');
    });
  });

  describe('getCopyrightCypherRelation', () => {
    it('🟢 doit retourner la relation Cypher exacte pour chaque rôle du Graphe', () => {
      expect(getCopyrightCypherRelation('CREATOR')).toBe('CREATED');
      expect(getCopyrightCypherRelation('SUBLIMATOR')).toBe('SUBLIMATES');
      expect(getCopyrightCypherRelation('CURATOR')).toBe('CURATES');
      expect(getCopyrightCypherRelation('UNKNOWN_ROLE')).toBe('CREATED'); // Fallback sécurisé
    });
  });
});