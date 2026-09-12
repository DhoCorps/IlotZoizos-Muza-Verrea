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

  const cacheKey = `showcase-stream-${userUid}-${filters.selectedApps.join('-')}-${filters.onlyTradable}`;
  return await unstable_cache(
    fetcher,
    [cacheKey],
    { revalidate: 30, tags: ['showcase', `showcase-${userUid}`] }
  )();
}