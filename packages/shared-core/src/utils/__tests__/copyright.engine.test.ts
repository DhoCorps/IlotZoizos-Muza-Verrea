import { describe, it, expect } from 'vitest';
import { 
  generateFileHash, 
  sanitizeCopyright, 
  getCopyrightCypherRelation, 
  generateCanopySeal 
} from '../copyright.engine'; // Adapte le chemin selon ton arborescence exacte

describe('Moteur Canopique : Crypto & Copyright (Sceau Unifié)', () => {
  
  describe('1. generateFileHash', () => {
    it('🟢 doit générer un hash SHA-256 valide à partir d\'une chaîne de caractères', () => {
      const content = "Ceci est un texte de test pour l'Îlot.";
      const hash = generateFileHash(content);
      
      expect(hash).toBeTypeOf('string');
      expect(hash).toHaveLength(64); // Longueur standard d'un hex SHA-256
    });

    it('🟢 doit générer le même hash pour un Buffer et une String équivalente', () => {
      const text = "Substance de l'Oiseau";
      const hashFromStr = generateFileHash(text);
      const hashFromBuf = generateFileHash(Buffer.from(text, 'utf-8'));

      expect(hashFromStr).toBe(hashFromBuf);
    });

    it('🔴 doit lever une erreur si le contenu est vide ou invalide', () => {
      expect(() => generateFileHash('')).toThrowError(/Un buffer ou un contenu valide est requis/);
    });
  });

  describe('2. sanitizeCopyright & getCopyrightCypherRelation', () => {
    it('🟢 doit appliquer les valeurs par défaut si le copyright est vide', () => {
      const result = sanitizeCopyright(undefined);
      expect(result).toEqual({ role: 'CREATOR', isExclusiveIlot: false });
    });

    it('🛡️ RÈGLE MÉTIER : doit forcer isExclusiveIlot à false si le rôle est CURATOR', () => {
      const result = sanitizeCopyright({
        role: 'CURATOR',
        isExclusiveIlot: true, // Tentative de forcer l'exclusivité en étant simple curateur
        originalAuthor: ' H.P. Lovecraft '
      });

      expect(result.role).toBe('CURATOR');
      expect(result.isExclusiveIlot).toBe(false); // Refusé par la règle métier
      expect(result.originalAuthor).toBe('H.P. Lovecraft'); // Nettoyé (trim)
    });

    it('🟢 doit traduire correctement les rôles en relations Cypher pour Neo4j', () => {
      expect(getCopyrightCypherRelation('CREATOR')).toBe('CREATED');
      expect(getCopyrightCypherRelation('SUBLIMATOR')).toBe('SUBLIMATES');
      expect(getCopyrightCypherRelation('CURATOR')).toBe('CURATES');
      expect(getCopyrightCypherRelation('INCONNU')).toBe('CREATED'); // Fallback par défaut
    });
  });

  describe('3. generateCanopySeal (Sceau Unifié Contenu + Copyright)', () => {
    it('🟢 doit sceller le contenu et les métadonnées de copyright en une empreinte unique', () => {
      const fileContent = "Manuscrit secret de la Canopée.";
      const copyright = {
        role: 'CREATOR' as const,
        isExclusiveIlot: true,
      };

      const seal1 = generateCanopySeal(fileContent, copyright);
      expect(seal1).toBeTypeOf('string');
      expect(seal1).toHaveLength(64);

      // Si on change un seul paramètre du copyright, le sceau global doit changer radicalement (intégrité cryptographique)
      const copyrightModified = {
        role: 'CREATOR' as const,
        isExclusiveIlot: false, // Modification de l'exclusivité
      };

      const seal2 = generateCanopySeal(fileContent, copyrightModified);
      expect(seal2).not.toBe(seal1);
    });
  });
});