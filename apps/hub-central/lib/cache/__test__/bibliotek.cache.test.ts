import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCachedBook, getCachedBookBySignature, getCachedBookAnnotations, getCachedBibliotekCatalog } from '@/lib/cache/bibliotek.cache';
import { LibraryBookModel, AnnotationModel, findEntityBySlugOrUid } from '@ilot/infrastructure';

// 🛡️ Mock de Next.js Cache
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb), // Bypass du cache pour tester la logique interne
  revalidateTag: vi.fn(),
}));

// 🛡️ Mock de l'infrastructure
vi.mock('@ilot/infrastructure', () => ({
  LibraryBookModel: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    }),
    findOne: vi.fn(),
  },
  AnnotationModel: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
  findEntityBySlugOrUid: vi.fn(),
}));

describe('Bibliotek Cache Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCachedBook', () => {
    it('doit récupérer un ouvrage via son UID ou Slug et le sérialiser', async () => {
      const mockBook = { uid: 'book_1', title: 'Le Grimoire de DhÖ' };
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(mockBook as any);

      const result = await getCachedBook('le-grimoire-de-dho');

      expect(findEntityBySlugOrUid).toHaveBeenCalledWith(LibraryBookModel, 'le-grimoire-de-dho');
      expect(result).toEqual({ uid: 'book_1', title: 'Le Grimoire de DhÖ' });
    });

    it('doit retourner null si l’ouvrage est introuvable', async () => {
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(null);

      const result = await getCachedBook('inconnu');

      expect(result).toBeNull();
    });
  });

  describe('getCachedBookBySignature', () => {
    it('doit récupérer un ouvrage via son sceau SHA-256 (Oracle)', async () => {
      const mockBook = { uid: 'book_sig', digitalSignature: 'abc123hash' };
      
      vi.mocked(LibraryBookModel.findOne).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(mockBook),
      } as any);

      const result = await getCachedBookBySignature('  abc123hash  ');

      expect(LibraryBookModel.findOne).toHaveBeenCalledWith({ digitalSignature: 'abc123hash' });
      expect(result).toEqual(mockBook);
    });

    it('doit retourner null si aucun ouvrage ne correspond au sceau', async () => {
      vi.mocked(LibraryBookModel.findOne).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(null),
      } as any);

      const result = await getCachedBookBySignature('unknown_hash');

      expect(result).toBeNull();
    });
  });

  describe('getCachedBookAnnotations', () => {
    it('doit récupérer les annotations associées à un ouvrage', async () => {
      const mockAnnotations = [
        { uid: 'anno_1', content: 'Note 1' },
        { uid: 'anno_2', content: 'Note 2' }
      ];

      vi.mocked(AnnotationModel.find).mockReturnValueOnce({
        sort: vi.fn().mockReturnValueOnce({
          lean: vi.fn().mockResolvedValueOnce(mockAnnotations),
        }),
      } as any);

      const result = await getCachedBookAnnotations('book_123');

      expect(AnnotationModel.find).toHaveBeenCalledWith({ targetUid: 'book_123' });
      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('Note 1');
    });
  });

  describe('getCachedBibliotekCatalog', () => {
    it('doit récupérer le catalogue complet si aucune catégorie n’est fournie', async () => {
      vi.mocked(LibraryBookModel.find).mockReturnValueOnce({
        sort: vi.fn().mockReturnValueOnce({
          lean: vi.fn().mockResolvedValueOnce([{ uid: 'b1' }, { uid: 'b2' }]),
        }),
      } as any);

      const result = await getCachedBibliotekCatalog();

      expect(LibraryBookModel.find).toHaveBeenCalledWith({});
      expect(result).toHaveLength(2);
    });

    it('doit récupérer le catalogue filtré par catégorie si spécifiée', async () => {
      vi.mocked(LibraryBookModel.find).mockReturnValueOnce({
        sort: vi.fn().mockReturnValueOnce({
          lean: vi.fn().mockResolvedValueOnce([{ uid: 'b1', category: 'PHILOSOPHY' }]),
        }),
      } as any);

      const result = await getCachedBibliotekCatalog('PHILOSOPHY');

      expect(LibraryBookModel.find).toHaveBeenCalledWith({ category: 'PHILOSOPHY' });
      expect(result).toHaveLength(1);
    });
  });
});