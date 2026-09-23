import { unstable_cache } from 'next/cache';
import { LibraryBookModel, AnnotationModel, findEntityBySlugOrUid } from '@ilot/infrastructure';

/**
 * 📚 Récupère et met en cache un ouvrage spécifique (Livre, Parchemin, etc.)
 */
export const getCachedBook = unstable_cache(
  async (identifier: string) => {
    try {
      const book = await findEntityBySlugOrUid(LibraryBookModel, identifier);
      if (!book) return null;
      return JSON.parse(JSON.stringify(book));
    } catch (error) {
      console.error(`[Bibliotek Cache] Erreur lors de la récupération de l'ouvrage ${identifier}:`, error);
      return null;
    }
  },
  ['bibliotek-book'],
  { tags: ['bibliotek', 'books'], revalidate: 86400 }
);

/**
 * 🔮 Récupère et met en cache la vérification d'un ouvrage via son sceau SHA-256 (Oracle)
 */
export const getCachedBookBySignature = unstable_cache(
  async (signature: string) => {
    try {
      const book = await LibraryBookModel.findOne({ digitalSignature: signature.trim() }).lean();
      if (!book) return null;
      return JSON.parse(JSON.stringify(book));
    } catch (error) {
      console.error(`[Bibliotek Cache] Erreur lors de la consultation de l'Oracle pour le sceau ${signature}:`, error);
      return null;
    }
  },
  ['bibliotek-oracle-signature'],
  { tags: ['bibliotek', 'oracle', 'books'], revalidate: 86400 }
);

/**
 * 🖋️ Récupère et met en cache les annotations d'un ouvrage
 */
export const getCachedBookAnnotations = unstable_cache(
  async (bookUid: string) => {
    try {
      const annotations = await AnnotationModel.find({ targetUid: bookUid })
        .sort({ createdAt: -1 })
        .lean();
      return JSON.parse(JSON.stringify(annotations));
    } catch (error) {
      console.error(`[Bibliotek Cache] Erreur lors de la récupération des annotations pour ${bookUid}:`, error);
      return [];
    }
  },
  ['bibliotek-annotations'],
  { tags: ['bibliotek', 'annotations'], revalidate: 3600 }
);

/**
 * 🗄️ Récupère et met en cache le catalogue global de la Bibliotek
 */
export const getCachedBibliotekCatalog = unstable_cache(
  async (category?: string) => {
    try {
      const query = category && category !== 'ALL' ? { category } : {};
      const books = await LibraryBookModel.find(query)
        .sort({ createdAt: -1 })
        .lean();
      return JSON.parse(JSON.stringify(books));
    } catch (error) {
      console.error("[Bibliotek Cache] Erreur lors de la récupération du catalogue :", error);
      return [];
    }
  },
  ['bibliotek-catalog'],
  { tags: ['bibliotek', 'catalog'], revalidate: 3600 }
);