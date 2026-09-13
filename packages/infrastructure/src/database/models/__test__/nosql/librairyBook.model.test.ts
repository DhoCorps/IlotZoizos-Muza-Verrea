import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LibraryBookModel } from '@ilot/infrastructure';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DE MONGOOSE
// -------------------------------------------------------------------------
vi.mock('@ilot/infrastructure', () => ({
  LibraryBookModel: {
    create: vi.fn(),
    findOne: vi.fn(),
  },
}));

describe('Modèle Mongoose : LibraryBook (Bibliotek)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit sédimenter un livre avec un type et un style standard ou personnalisé par l’Oiseau', async () => {
    const mockBookData = {
      uid: 'book_123',
      title: 'Chroniques de la Canopée',
      slug: 'chroniques-de-la-canopee',
      authorUid: 'bird_1',
      authorSlug: 'oiseau-libre',
      writingType: 'essai', // Type standard
      style: 'cyber-philosophie-sauvage', // Style libre défini par l'Oiseau
      fileUrl: 'https://cdn.ilot/books/chroniques.epub',
      format: 'epub',
      digitalSignature: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // SHA-256 simulé
      timestampedAt: new Date(),
      copyrightClaimed: true,
      settings: {
        allowReadExchange: true,
        consentForShowcase: true
      }
    };

    vi.mocked(LibraryBookModel.create).mockResolvedValueOnce({
      ...mockBookData,
      _id: 'mongo_id_book_01'
    } as any);

    const createdBook = await LibraryBookModel.create(mockBookData);

    expect(createdBook).toBeDefined();
    expect(createdBook.title).toBe('Chroniques de la Canopée');
    expect(createdBook.writingType).toBe('essai');
    expect(createdBook.style).toBe('cyber-philosophie-sauvage'); // Validation de la liberté créative
    expect(createdBook.digitalSignature).toHaveLength(64); // Vérification du Sceau SHA-256
    expect(createdBook.copyrightClaimed).toBe(true);
  });

  it('🟢 doit accepter un type d’écrit entièrement libre inventé par l’Oiseau', async () => {
    const customWritingBook = {
      uid: 'book_456',
      title: 'Fragments d’un Rêve Électrique',
      slug: 'fragments-dun-reve-electrique',
      authorUid: 'bird_1',
      authorSlug: 'oiseau-libre',
      writingType: 'poeme-cyber-alchimique', // Valeur totalement libre
      style: 'experimental-sombre',         // Valeur totalement libre
      fileUrl: 'https://cdn.ilot/books/fragments.txt',
      format: 'scriptorium',
      digitalSignature: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      timestampedAt: new Date(),
    };

    vi.mocked(LibraryBookModel.create).mockResolvedValueOnce({
      ...customWritingBook,
      _id: 'mongo_id_book_02'
    } as any);

    const result = await LibraryBookModel.create(customWritingBook);

    expect(result.writingType).toBe('poeme-cyber-alchimique');
    expect(result.style).toBe('experimental-sombre');
  });

  it('❌ doit échouer si le Sceau d’antériorité (digitalSignature) est absent', async () => {
    const invalidBook = {
      uid: 'book_789',
      title: 'Livre sans sceau',
      slug: 'livre-sans-sceau',
      authorUid: 'bird_1',
      // digitalSignature manquant intentionnellement
    };

    vi.mocked(LibraryBookModel.create).mockRejectedValueOnce(new Error('Validation failed: digitalSignature is required'));

    await expect(LibraryBookModel.create(invalidBook as any)).rejects.toThrow();
  });
});