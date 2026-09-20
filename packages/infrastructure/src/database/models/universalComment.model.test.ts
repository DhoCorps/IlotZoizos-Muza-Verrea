import { describe, it, expect } from 'vitest';
import { UniversalCommentModel } from './nosql/universalComment.model';

describe('UniversalCommentModel (Mongoose)', () => {
  it('devrait assigner les valeurs par défaut (allowComments, isHidden)', () => {
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
  });

  it('devrait échouer si des champs requis manquent', () => {
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
});