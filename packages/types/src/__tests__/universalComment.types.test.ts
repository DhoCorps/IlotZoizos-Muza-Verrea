import { describe, it, expect } from 'vitest';
import { UniversalCommentSchema } from '../models/universalComment.types';

describe('UniversalCommentSchema', () => {
  it('devrait valider un commentaire valide sur un SUJET avec les valeurs par défaut', () => {
    const validComment = {
      uid: '123e4567-e89b-12d3-a456-426614174000',
      authorUid: '123e4567-e89b-12d3-a456-426614174001',
      targetUid: '123e4567-e89b-12d3-a456-426614174002',
      targetType: 'SUJET',
      content: 'Ceci est une résonance magnifique.',
    };

    const result = UniversalCommentSchema.safeParse(validComment);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.allowComments).toBe(true);
      expect(result.data.allowReactions).toBe(true);
      expect(result.data.isHidden).toBe(false);
      expect(result.data.isScholarSealed).toBe(false); // Vérification de l'absence du sceau par défaut
    }
  });

  it('devrait rejeter un commentaire avec un contenu vide', () => {
    const emptyContentComment = {
      uid: '123e4567-e89b-12d3-a456-426614174000',
      authorUid: '123e4567-e89b-12d3-a456-426614174001',
      targetUid: '123e4567-e89b-12d3-a456-426614174002',
      targetType: 'PARTITA',
      content: '', // Invalide
    };

    const result = UniversalCommentSchema.safeParse(emptyContentComment);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Un écho ne peut être vide");
    }
  });

  it('devrait accepter un commentaire parent (réponse à un commentaire) arborant le Sceau de l\'Érudit', () => {
    const replyComment = {
      uid: '123e4567-e89b-12d3-a456-426614174000',
      authorUid: '123e4567-e89b-12d3-a456-426614174001',
      targetUid: '123e4567-e89b-12d3-a456-426614174002',
      targetType: 'COMMENT', // Cible un autre commentaire
      parentId: '123e4567-e89b-12d3-a456-426614174002',
      content: 'Je suis d accord avec cette vision.',
      isScholarSealed: true, // Le Sceau a été apposé !
    };

    const result = UniversalCommentSchema.safeParse(replyComment);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isScholarSealed).toBe(true);
    }
  });
});