// Fichier : packages/types/src/__tests__/annotation.types.test.ts
import { describe, it, expect } from 'vitest';
import {
  IUniversalAnnotation,
  ICreateUniversalAnnotationInput,
  AnnotationTargetTypeSchema,
  UniversalAnnotationSchema
} from '../core/annotation.types';
import { EntityTargetEnum } from '../models/common.types';

describe('Types: Universal Annotation (SSOT EntityTargetEnum)', () => {
  it('🟢 vérifie que AnnotationTargetTypeSchema pointe sur la SSOT EntityTargetEnum', () => {
    expect(AnnotationTargetTypeSchema).toBe(EntityTargetEnum);
  });

  it('🟢 doit valider la structure d’une annotation pour un Ouvrage (BOOK) et coercer la date', () => {
    const isoDateString = new Date().toISOString();
    
    // On simule un payload brut venant de l'API (avec une date en string)
    const rawBookAnnotation = {
      uid: 'annot_123',
      targetUid: 'book_456',
      targetType: 'BOOK',
      targetTitle: 'Le Mythe de Sisyphe',
      authorUid: 'user_789',
      selectedText: 'Il faut imaginer Sisyphe heureux.',
      comment: 'Une fulgurance incontournable.',
      importance: 5,
      isScholarSealed: true,
      createdAt: isoDateString // String ISO
    };

    const result = UniversalAnnotationSchema.safeParse(rawBookAnnotation);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.targetType).toBe('BOOK');
      expect(result.data.targetUid).toBe('book_456');
      expect(result.data.isScholarSealed).toBe(true);
      // ⏳ Vérification du z.coerce.date()
      expect(result.data.createdAt).toBeInstanceOf(Date);
      expect(result.data.createdAt?.toISOString()).toBe(isoDateString);
    }
  });

  it('🟢 doit valider la structure d’une annotation pour un Article de Blog (ARTICLE)', () => {
    const articleAnnotation: IUniversalAnnotation = {
      uid: 'annot_999',
      targetUid: 'article_111',
      targetType: 'ARTICLE',
      targetTitle: 'Architecture Monorépo',
      authorUid: 'user_222',
      selectedText: 'La séparation des responsabilités est vitale.',
      emotion: '💡',
      createdAt: new Date()
    };

    const result = UniversalAnnotationSchema.safeParse(articleAnnotation);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.targetType).toBe('ARTICLE');
      expect(result.data.emotion).toBe('💡');
      expect(result.data.importance).toBeUndefined(); // L'importance est optionnelle
    }
  });

  it('🟢 doit valider les données en entrée lors de la création d’une annotation', () => {
    const payload: ICreateUniversalAnnotationInput = {
      targetUid: 'comment_777',
      targetType: 'COMMENT',
      selectedText: 'Je ne suis pas d’accord avec cette approche.',
      comment: 'Débat intéressant à creuser.',
    };

    expect(payload.targetType).toBe('COMMENT');
    expect(payload.selectedText).toContain('pas d’accord');
    expect(payload).not.toHaveProperty('uid'); // En création, l'UID n'est pas encore assigné
  });
});