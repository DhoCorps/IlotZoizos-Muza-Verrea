import { describe, it, expect } from 'vitest';
import { UniversalCommentModel } from '../../nosql/universalComment.model';

describe('UniversalCommentModel (Mongoose)', () => {
  it('🟢 devrait assigner les valeurs par défaut (allowComments, isHidden, isScholarSealed)', () => {
    const commentData = {
      uid: 'uid-123',
      authorUid: 'author-456',
      targetUid: 'target-789',
      targetType: 'SUJET',
      content: 'Un murmure dans le Kosmos',
    };

    const comment = new UniversalCommentModel(commentData);
    
    // On valide de manière synchrone sans avoir besoin d'une vraie base connectée
    const validationError = comment.validateSync();
    
    expect(validationError).toBeUndefined();
    expect(comment.allowComments).toBe(true);
    expect(comment.allowReactions).toBe(true);
    expect(comment.isHidden).toBe(false);
    expect(comment.isScholarSealed).toBe(false); // Vérification du sceau par défaut
  });

  it('🔴 devrait échouer si des champs requis manquent', () => {
    const incompleteData = {
      authorUid: 'author-456',
      content: 'Texte seul',
    };

    const comment = new UniversalCommentModel(incompleteData);
    const validationError = comment.validateSync();

    expect(validationError).toBeDefined();
    if (validationError) {
      expect(validationError.errors.uid).toBeDefined();
      expect(validationError.errors.targetUid).toBeDefined();
      expect(validationError.errors.targetType).toBeDefined();
    }
  });

  it('🔴 devrait échouer si le targetType n\'est pas dans l\'Enum autorisé', () => {
    const invalidTypeData = {
      uid: 'uid-124',
      authorUid: 'author-457',
      targetUid: 'target-790',
      targetType: 'INVALID_TARGET', // Cible non prévue par l'architecture
      content: 'Ce message se perdra dans le vide.',
    };

    const comment = new UniversalCommentModel(invalidTypeData);
    const validationError = comment.validateSync();

    expect(validationError).toBeDefined();
    if (validationError) {
      expect(validationError.errors.targetType).toBeDefined();
    }
  });

  it('🟢 devrait valider un commentaire scellé par un Érudit sur une cible du réseau (ex: BLOG)', () => {
    const scholarCommentData = {
      uid: 'uid-125',
      authorUid: 'author-458',
      targetUid: 'target-791',
      targetType: 'BLOG', 
      content: 'Une analyse brillante qui mérite de trôner en bas de l\'article.',
      isScholarSealed: true, // Le Sceau est actif
    };

    const comment = new UniversalCommentModel(scholarCommentData);
    const validationError = comment.validateSync();

    expect(validationError).toBeUndefined();
    expect(comment.isScholarSealed).toBe(true);
  });
});