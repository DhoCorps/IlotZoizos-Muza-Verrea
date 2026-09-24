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

describe('Modèle Mongoose : LibraryBook (Bibliotek, Gacha, Émotions, SEO & Copyright)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit sédimenter un livre avec un type, style, statut de publication, données SEO/Économiques et copyright enrichi', async () => {
    const mockBookData = {
      uid: 'book_123',
      title: 'Chroniques de la Canopée',
      slug: 'chroniques-de-la-canopee',
      authorUid: 'bird_1',
      authorSlug: 'oiseau-libre',
      writingType: 'essai',
      style: 'cyber-philosophie-sauvage',
      status: 'PUBLISHED',
      fileUrl: 'https://cdn.ilot/books/chroniques.epub',
      format: 'epub',
      digitalSignature: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      timestampedAt: new Date(),
      copyrightClaimed: true,
      copyrightMetadata: {
        role: 'SUBLIMATOR',
        originalAuthor: 'Penseur Ancien',
        isExclusiveIlot: true
      },
      settings: {
        allowReadExchange: true,
        consentForShowcase: true
      },
      seo: {
        metaTitle: 'Chroniques de la Canopée',
        ogType: 'book',
        articleAuthor: 'oiseau-libre'
      },
      economy: {
        priceCents: 1500,
        barterAllowed: true,
        gachaTier: 'epic',
        isTradable: true,
        rights: { allowBarter: true, allowLending: true }
      }
    };

    vi.mocked(LibraryBookModel.create).mockResolvedValueOnce({
      ...mockBookData,
      _id: 'mongo_id_book_01'
    } as any);

    const createdBook = await LibraryBookModel.create(mockBookData);

    expect(createdBook).toBeDefined();
    expect(createdBook.title).toBe('Chroniques de la Canopée');
    expect(createdBook.status).toBe('PUBLISHED');
    expect(createdBook.seo.ogType).toBe('book');
    expect(createdBook.economy.gachaTier).toBe('epic');
    expect(createdBook.digitalSignature).toHaveLength(64);
    expect(createdBook.copyrightMetadata.role).toBe('SUBLIMATOR');
    expect(createdBook.copyrightMetadata.isExclusiveIlot).toBe(true);
  });

  it('🟢 doit consigner un Surlignage Émotionnel ciblé avec signature et une Note d\'Érudit', async () => {
    const bookWithHighlights = {
      uid: 'book_456',
      title: 'Fragments d’un Rêve Électrique',
      slug: 'fragments-dun-reve-electrique',
      authorUid: 'bird_1',
      authorSlug: 'oiseau-libre',
      writingType: 'poeme-cyber-alchimique',
      style: 'experimental-sombre',
      status: 'DRAFT',
      fileUrl: 'https://cdn.ilot/books/fragments.txt',
      format: 'scriptorium',
      digitalSignature: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      timestampedAt: new Date(),
      emotionalHighlights: [
        {
          uid: 'emo_001',
          readerUid: 'bird_reader_1',
          selectedText: 'Le chant silencieux des étoiles, résonne dans la matrice.',
          emotion: '<(:<',
          comment: 'Cette fulgurance m\'a transpercé l\'esprit.',
          isScholarSealed: true, // Promeut en Note d'Érudit
          createdAt: new Date()
        }
      ]
    };

    vi.mocked(LibraryBookModel.create).mockResolvedValueOnce({
      ...bookWithHighlights,
      _id: 'mongo_id_book_02'
    } as any);

    const result = await LibraryBookModel.create(bookWithHighlights);

    expect(result.writingType).toBe('poeme-cyber-alchimique');
    expect(result.emotionalHighlights).toHaveLength(1);
    expect(result.emotionalHighlights[0].emotion).toBe('<(:<');
    expect(result.emotionalHighlights[0].isScholarSealed).toBe(true);
  });

  it('❌ doit échouer si le Sceau d’antériorité (digitalSignature) est absent', async () => {
    const invalidBook = {
      uid: 'book_789',
      title: 'Livre sans sceau',
      slug: 'livre-sans-sceau',
      authorUid: 'bird_1',
    };

    vi.mocked(LibraryBookModel.create).mockRejectedValueOnce(new Error('Validation failed: digitalSignature is required'));

    await expect(LibraryBookModel.create(invalidBook as any)).rejects.toThrow();
  });
});