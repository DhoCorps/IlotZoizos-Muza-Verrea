// Fichier : packages/infrastructure/src/__tests__/bibliotek.model.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LibraryBookModel } from '@ilot/infrastructure';

vi.mock('@ilot/infrastructure', () => ({
  LibraryBookModel: {
    create: vi.fn(),
    findOne: vi.fn(),
  },
}));

describe('Modèle Mongoose : LibraryBook (Bibliotek, Gacha, Émotions, SEO, Copyright & Filiation)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit sédimenter un livre enrichi avec le Pacte de Filiation et l’économie Gacha', async () => {
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
        isExclusiveIlot: true,
        filiation: {
          isExternalSource: true,
          sourceAuthorName: 'Penseur Ancien',
          sourceWorkTitle: 'Le Codex Oublié',
          claimStatus: 'PENDING_CLAIM',
          escrowBalance: 0
        }
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
    expect(createdBook.economy.gachaTier).toBe('epic');
    expect(createdBook.digitalSignature).toHaveLength(64);
    expect(createdBook.copyrightMetadata.role).toBe('SUBLIMATOR');
    expect(createdBook.copyrightMetadata.isExclusiveIlot).toBe(true);
    expect(createdBook.copyrightMetadata.filiation.claimStatus).toBe('PENDING_CLAIM');
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