// Fichier : lib/cache/showcase.cache.ts
import { unstable_cache } from 'next/cache';
import { ShowcaseOrchestrator } from '@ilot/shared-core';

// Extraction automatique du type exact attendu par l'orchestrateur (zéro doublon, zéro `any`)
export type ShowcaseFilters = Parameters<typeof ShowcaseOrchestrator.getPersonalizedShowcase>[1];

// -------------------------------------------------------------------------
// CACHE : Récupération du flux personnalisé Showcase (avec bypass en test)
// -------------------------------------------------------------------------
export async function getCachedStream(userUid: string, filters: ShowcaseFilters) {
  const fetcher = async () => {
    return await ShowcaseOrchestrator.getPersonalizedShowcase(userUid, filters);
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  // Accès direct et typé aux propriétés de l'objet ShowcaseFilterOptions
  const selectedApps = filters?.selectedApps;
  const sortedApps = Array.isArray(selectedApps) 
    ? [...selectedApps].sort().join('-') 
    : '';

  const onlyTradable = filters?.onlyTradable ?? false;
  const cacheKey = `showcase-stream-${userUid}-${sortedApps}-${onlyTradable}`;
  
  return await unstable_cache(
    fetcher,
    [cacheKey],
    { revalidate: 30, tags: ['showcase', `showcase-${userUid}`] }
  )();
}