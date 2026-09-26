import { describe, it, expect } from 'vitest';
import { UniversalAnnotationModel } from '../../nosql/universalAnnotation.model'; // Ajuste le chemin selon ton arborescence exacte

describe('Modèle : UniversalAnnotation (Fusionné)', () => {
  it('🟢 doit valider un document complet et appliquer le nettoyage (trim)', () => {
    const validDoc = new UniversalAnnotationModel({
      uid: 'annot_12345',
      targetUid: 'article_987',
      targetType: 'ARTICLE',
      targetTitle: 'Maîtriser le Monorépo',
      authorUid: 'user_456',
      selectedText: 'Le couplage lâche est essentiel.',
      // Ajout d'espaces superflus pour vérifier la règle `trim: true` héritée de l'ancien modèle
      comment: '   Excellente réflexion !   ', 
      emotion: '💡',
      importance: 3
    });

    const error = validDoc.validateSync();
    
    expect(error).toBeUndefined();
    // On vérifie que Mongoose a bien nettoyé les espaces avant et après grâce au `trim: true`
    expect(validDoc.comment).toBe('Excellente réflexion !');
  });

  it('🔴 doit échouer si le targetType n’est pas dans l’enum (ex: PODCAST)', () => {
    const invalidTypeDoc = new UniversalAnnotationModel({
      uid: 'annot_12345',
      targetUid: 'podcast_123',
      targetType: 'PODCAST', // 👈 Type non autorisé
      authorUid: 'user_456',
      selectedText: 'Une belle écoute.',
    });

    const error = invalidTypeDoc.validateSync();
    
    expect(error).toBeDefined();
    expect(error?.errors.targetType).toBeDefined();
    expect(error?.errors.targetType.message).toContain('is not a valid enum value');
  });

  it('🔴 doit échouer si l’importance dépasse la limite de 5', () => {
    const invalidImportanceDoc = new UniversalAnnotationModel({
      uid: 'annot_12345',
      targetUid: 'book_999',
      targetType: 'BOOK',
      authorUid: 'user_456',
      selectedText: 'Un passage mémorable.',
      importance: 6 // 👈 Hors de la limite autorisée (max: 5)
    });

    const error = invalidImportanceDoc.validateSync();
    
    expect(error).toBeDefined();
    expect(error?.errors.importance).toBeDefined();
  });

  it('🔴 doit échouer si les champs requis (targetUid, authorUid, selectedText) sont manquants', () => {
    const incompleteDoc = new UniversalAnnotationModel({
      uid: 'annot_12345',
      targetType: 'COMMENT', // Type valide, mais le reste manque
    });

    const error = incompleteDoc.validateSync();
    
    expect(error).toBeDefined();
    expect(error?.errors.targetUid).toBeDefined();
    expect(error?.errors.authorUid).toBeDefined();
    expect(error?.errors.selectedText).toBeDefined();
  });

  it('🟢 doit garantir la présence des index simples et composites pour les performances', () => {
    const indexes = UniversalAnnotationModel.schema.indexes();
    
    // Vérification de l'index composite ciblant le type et l'identifiant de la cible
    const hasTargetCompositeIndex = indexes.some(
      (idx) => idx[0].targetType === 1 && idx[0].targetUid === 1
    );
    
    // Vérification de l'index composite ciblant l'auteur et le type d'annotation
    const hasAuthorCompositeIndex = indexes.some(
      (idx) => idx[0].authorUid === 1 && idx[0].targetType === 1
    );

    // Vérification de l'index unique de l'UID
    const hasUidIndex = indexes.some(
      (idx) => idx[0].uid === 1
    );

    expect(hasTargetCompositeIndex).toBe(true);
    expect(hasAuthorCompositeIndex).toBe(true);
    expect(hasUidIndex).toBe(true);
  });
});