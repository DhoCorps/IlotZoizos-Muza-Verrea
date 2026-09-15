// Fichier : lib/cache/kompta.cache.ts
import { unstable_cache } from 'next/cache';
import { LedgerEntryModel } from '@ilot/infrastructure';

// -------------------------------------------------------------------------
// CACHE CHIRURGICAL : Récupération du Grand Livre Kompta (avec bypass en test)
// -------------------------------------------------------------------------
export async function getCachedLedgerEntries(userUid: string) {
  const fetcher = async () => {
    return await LedgerEntryModel.find({ ownerUid: userUid }).sort({ createdAt: -1 }).lean();
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  const cacheKey = `kompta-ledger-${userUid}`;
  
  return await unstable_cache(
    fetcher,
    [cacheKey],
    { revalidate: 15, tags: ['kompta', `kompta-${userUid}`] }
  )();
}