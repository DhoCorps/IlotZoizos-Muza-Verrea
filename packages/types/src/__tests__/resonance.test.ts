// packages/types/src/__tests__/resonance.test.ts
import { describe, it, expect } from 'vitest';
import { EchoSchema, WeaveLinkSchema } from '../models/resonance.types'; // Ajuste le chemin si besoin selon ton arborescence

describe('Validation des Schémas de Résonance (Zod)', () => {
  
  // ==========================================
  // 1. TESTS DE L'ÉCHO SCHEMA
  // ==========================================
  describe('EchoSchema', () => {
    it('🟢 doit valider un écho textuel correct', () => {
      const validEcho = {
        content: 'Superbe réalisation !',
        echoType: 'TEXT', // 👈 Mis à jour (echoType au lieu de type)
        targetUid: 'user_123',
        targetLabel: 'Project',
      };

      const result = EchoSchema.safeParse(validEcho);
      expect(result.success).toBe(true);
    });

    it('🟢 doit valider un écho de type émoji correct', () => {
      const validEmojiEcho = {
        content: '🔥',
        echoType: 'EMOJI', // 👈 Mis à jour
        targetUid: 'sujet_456',
        targetLabel: 'Sujet',
      };

      const result = EchoSchema.safeParse(validEmojiEcho);
      expect(result.success).toBe(true);
    });

    it('🔴 doit rejeter un écho dont le contenu est vide', () => {
      const invalidEcho = {
        content: '',
        echoType: 'TEXT',
        targetUid: 'user_123',
        targetLabel: 'Project',
      };

      const result = EchoSchema.safeParse(invalidEcho);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("ne peut être vide");
      }
    });

    it('🔴 doit rejeter un écho avec un echoType invalide', () => {
      const invalidTypeEcho = {
        content: 'Test',
        echoType: 'INVALID_TYPE',
        targetUid: 'user_123',
        targetLabel: 'Project',
      };

      const result = EchoSchema.safeParse(invalidTypeEcho);
      expect(result.success).toBe(false);
    });
  });

  // ==========================================
  // 2. TESTS DU WEAVE LINK SCHEMA
  // ==========================================
  describe('WeaveLinkSchema', () => {
    it('🟢 doit valider un lien de résonance complet avec entityId', () => {
      const validLink = {
        sourceUid: 'bird_A',
        sourceLabel: 'User',        // 👈 Requis par le nouveau schéma
        targetUid: 'bird_B',
        targetLabel: 'Project',     // 👈 Requis par le nouveau schéma
        relationType: 'FOLLOWS_SPECIFIC', // 👈 Rétégré (relationType)
        entityId: 'proj_X',
      };

      const result = WeaveLinkSchema.safeParse(validLink);
      expect(result.success).toBe(true);
    });

    it('🟢 doit valider un lien de résonance global sans entityId (optionnel)', () => {
      const validGlobalLink = {
        sourceUid: 'bird_A',
        sourceLabel: 'User',
        targetUid: 'bird_B',
        targetLabel: 'User',
        relationType: 'FOLLOWS_GLOBAL',
      };

      const result = WeaveLinkSchema.safeParse(validGlobalLink);
      expect(result.success).toBe(true);
    });

    it('🔴 doit rejeter un lien s’il manque des champs obligatoires', () => {
      const incompleteLink = {
        sourceUid: 'bird_A',
        relationType: 'ILLUMINATES',
      };

      const result = WeaveLinkSchema.safeParse(incompleteLink);
      expect(result.success).toBe(false);
    });
  });

});