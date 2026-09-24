// Fichier : lib/cache/sujets.cache.ts
import { unstable_cache } from 'next/cache';
import { SujetModel } from '@ilot/infrastructure';

// -------------------------------------------------------------------------
// CACHE : Récupération des sujets (Bibliothèque)
// -------------------------------------------------------------------------
export const getCachedSujets = (userUid?: string, category?: string) => {
  return unstable_cache(
    async () => {
      const queryFilter: Record<string, unknown> & {
        $or?: Array<Record<string, unknown>>;
      } = {
        $or: [{ status: 'PUBLISHED' }]
      };

      if (userUid && queryFilter.$or) {
        queryFilter.$or.push({ authorUid: userUid });
      }
      if (category) {
        queryFilter.category = category;
      }

      return await SujetModel.find(queryFilter)
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
    },
    [`sujets-list-${userUid || 'public'}-${category || 'all'}`],
    { revalidate: 60, tags: ['sujets', `sujets-user-${userUid || 'public'}`] }
  )();
};

// -------------------------------------------------------------------------
// CACHE : Récupération d'un sujet spécifique par son identifiant ou slug
// -------------------------------------------------------------------------
export const getCachedSujetDetails = (identifier: string) => {
  return unstable_cache(
    async () => {
      return await SujetModel.findOne({
         $or: [{ slug: identifier }, { uid: identifier }]
       }).lean();
    },
    [`sujet-details-${identifier}`],
    { revalidate: 60, tags: ['sujets', `sujet-${identifier}`] }
  )();
};