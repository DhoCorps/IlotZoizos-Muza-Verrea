import { SampleModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { ISample } from '@ilot/types';
import { unstable_cache } from 'next/cache';

/**
 * 🗄️ Récupère l'intégralité du catalogue public (PUBLISHED + Non Quarantinés)
 */
export const getCachedSamples = unstable_cache(
  async () => {
    try {
      const samples = await SampleModel.find({ 
        status: 'PUBLISHED',
        'moderation.isQuarantined': false 
      }).sort({ createdAt: -1 }).lean();
      return JSON.parse(JSON.stringify(samples)) as ISample[];
    } catch (error) {
      console.error('🔥 [CACHE ERROR] getCachedSamples:', error);
      return [];
    }
  },
  ['samplotek-public-catalog'],
  { tags: ['samples', 'samplotek'], revalidate: 3600 } // Rafraîchissement auto chaque heure
);

/**
 * 🗄️ Récupère un sample spécifique ultra-rapidement
 */
export const getCachedSample = async (identifier: string): Promise<ISample | null> => {
  const fetchSample = unstable_cache(
    async (id: string) => {
      try {
        const sample = await findEntityBySlugOrUid(SampleModel, id);
        return sample ? (JSON.parse(JSON.stringify(sample)) as ISample) : null;
      } catch (error) {
        console.error(`🔥 [CACHE ERROR] getCachedSample (${id}):`, error);
        return null;
      }
    },
    [`sample-item-${identifier}`],
    { tags: [`sample-${identifier}`, 'samples'], revalidate: 86400 } // 24h
  );

  return fetchSample(identifier);
};