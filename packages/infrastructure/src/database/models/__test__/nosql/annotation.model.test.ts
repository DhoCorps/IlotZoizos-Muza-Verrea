import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnnotationModel } from '@ilot/infrastructure';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DE MONGOOSE
// -------------------------------------------------------------------------
vi.mock('@ilot/infrastructure', () => ({
  AnnotationModel: {
    create: vi.fn(),
    find: vi.fn(),
  },
}));

describe('Modèle Mongoose : Annotation (Bibliotek Notes)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit sédimenter une note avec un passage surligné, un commentaire et une importance', async () => {
    const mockAnnotationData = {
      uid: 'annot_123',
      bookUid: 'book_999',
      bookTitle: 'Traité de Philosophie Sauvage',
      authorUid: 'bird_1',
      selectedText: 'Le conatus est l’effort par lequel chaque chose persiste dans son être.',
      comment: 'Fondamental pour comprendre Spinoza.',
      importance: 3, // Vital / Fondamentale
      chapterReference: 'Chapitre 2'
    };

    vi.mocked(AnnotationModel.create).mockResolvedValueOnce({
      ...mockAnnotationData,
      _id: 'mongo_id_annot_01',
      createdAt: new Date()
    } as any);

    const createdAnnotation = await AnnotationModel.create(mockAnnotationData);

    expect(createdAnnotation).toBeDefined();
    expect(createdAnnotation.bookTitle).toBe('Traité de Philosophie Sauvage');
    expect(createdAnnotation.importance).toBe(3);
    expect(createdAnnotation.selectedText).toContain('conatus');
  });

  it('❌ doit échouer si le texte surligné (selectedText) est absent', async () => {
    const invalidAnnotation = {
      uid: 'annot_456',
      bookUid: 'book_999',
      bookTitle: 'Essai',
      authorUid: 'bird_1',
      importance: 2
      // selectedText manquant intentionnellement
    };

    vi.mocked(AnnotationModel.create).mockRejectedValueOnce(new Error('Validation failed: selectedText is required'));

    await expect(AnnotationModel.create(invalidAnnotation as any)).rejects.toThrow();
  });
});