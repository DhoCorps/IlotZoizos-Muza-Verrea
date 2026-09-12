// Fichier : lib/cache/samplotek.cache.ts
import { unstable_cache } from 'next/cache';
import { SampleModel } from '@ilot/infrastructure';
import { ISample } from '@ilot/types';

// -------------------------------------------------------------------------
// CACHE : Récupération rapide de la banque de sons
// -------------------------------------------------------------------------
export async function getCachedSamples(): Promise<ISample[]> {
  const fetcher = async (): Promise<ISample[]> => {
    const rawSamples = await SampleModel.find({}).sort({ createdAt: -1 }).lean();
    return rawSamples as unknown as ISample[];
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  return await unstable_cache(
    fetcher,
    ['samplotek-samples-library'],
    { revalidate: 30, tags: ['samples'] }
  )();
}