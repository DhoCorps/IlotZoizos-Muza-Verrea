// Fichier : lib/cache/partita.cache.ts
import { unstable_cache } from 'next/cache';
import { PartitaModel } from '@ilot/infrastructure';

// -------------------------------------------------------------------------
// CACHE : Récupération optimisée du catalogue des partitions
// -------------------------------------------------------------------------
export const getCachedPartitas = (userUid?: string, filterInstrument?: string | null, filterStatus?: string | null) => {
  return unstable_cache(
    async () => {
      let queryFilter: any = {
        $or: [
          { status: 'PUBLISHED' } // Les partitions publiées sont visibles par tous
        ]
      };
      if (userUid) {
        queryFilter.$or.push({ authorUid: userUid });
      }
      if (filterInstrument) queryFilter.instrument = filterInstrument;
      if (filterStatus) queryFilter.status = filterStatus;
      return await PartitaModel.find(queryFilter)
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
    },
    [`partitas-list-${userUid || 'public'}-${filterInstrument || 'all'}-${filterStatus || 'all'}`],
    { revalidate: 60, tags: ['partitas', `partitas-user-${userUid || 'public'}`] }
  )();
};

// -------------------------------------------------------------------------
// CACHE SÉCURISÉ : Récupération d'une partition par son slug ou uid
// -------------------------------------------------------------------------
export const getCachedPartitaDetails = async (identifier: string) => {
  const fetcher = async () => {
    return await PartitaModel.findOne({ 
       $or: [{ slug: identifier }, { uid: identifier }] 
     }).lean();
  };
  
  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }
  
  return await unstable_cache(
    fetcher,
    [`partita-details-${identifier}`],
    { revalidate: 60, tags: ['partitas', `partita-${identifier}`] }
  )();
};