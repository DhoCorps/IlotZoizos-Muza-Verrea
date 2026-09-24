// Fichier : lib/cache/media.cache.ts
import { unstable_cache } from 'next/cache';
import { ProductModel } from '@ilot/infrastructure';

export interface MediaFeedResult {
  visuals: unknown[];
  tracks: unknown[];
}

// -------------------------------------------------------------------------
// CACHE SÉCURISÉ : Flux média mis en cache brièvement (30s) avec bypass en mode test
// -------------------------------------------------------------------------
export async function getCachedMediaFeed(): Promise<MediaFeedResult> {
  const fetcher = async (): Promise<MediaFeedResult> => {
    let visuals: unknown[] = [];
    let tracks: unknown[] = [];
    try {
      visuals = await ProductModel.find({ 
         category: { $in: ['FONT_SPRITE', 'GRAPHIC', 'VIDEO', 'CINEMA'] } 
       }).limit(20).lean();
    } catch (visError: unknown) {
      console.error("  [MEDIA STREAM FEED] Erreur de récupération des visuels :", visError);
    }
    try {
      tracks = await ProductModel.find({ 
         category: { $in: ['MUSIC', 'AUDIO', 'PARTITA'] } 
       }).limit(20).lean();
    } catch (trackError: unknown) {
      console.error("  [MEDIA STREAM FEED] Erreur de récupération des pistes :", trackError);
    }
    return { visuals, tracks };
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  return await unstable_cache(
    fetcher,
    ['media-stream-feed'],
    { revalidate: 30, tags: ['media-feed', 'products'] }
  )();
}