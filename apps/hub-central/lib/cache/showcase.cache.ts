// Fichier : lib/cache/showcase.cache.ts
import { unstable_cache } from 'next/cache';
import { ShowcaseOrchestrator } from '@ilot/shared-core';

// -------------------------------------------------------------------------
// CACHE : Récupération du flux personnalisé Showcase (avec bypass en test)
// -------------------------------------------------------------------------
export async function getCachedStream(userUid: string, filters: any) {
  const fetcher = async () => {
    return await ShowcaseOrchestrator.getPersonalizedShowcase(userUid, filters);
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  // Normalisation du tri des applications pour assurer l'unicité et la stabilité de la clé de cache
  const sortedApps = Array.isArray(filters?.selectedApps) 
    ? [...filters.selectedApps].sort().join('-') 
    : '';

  const cacheKey = `showcase-stream-${userUid}-${sortedApps}-${filters?.onlyTradable ?? false}`;
  
  return await unstable_cache(
    fetcher,
    [cacheKey],
    { revalidate: 30, tags: ['showcase', `showcase-${userUid}`] }
  )();
}