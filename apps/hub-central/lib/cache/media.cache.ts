// Fichier : lib/cache/media.cache.ts
import { unstable_cache } from 'next/cache';
import { ProductModel } from '@ilot/infrastructure';

// -------------------------------------------------------------------------
// CACHE SÉCURISÉ : Flux média mis en cache brièvement (30s) avec bypass en mode test[cite: 9]
// -------------------------------------------------------------------------
export async function getCachedMediaFeed() {
  const fetcher = async () => {
    let visuals: any[] = [];
    let tracks: any[] = [];
    try {
      visuals = await ProductModel.find({ 
         category: { $in: ['FONT_SPRITE', 'GRAPHIC', 'VIDEO', 'CINEMA'] } 
       }).limit(20).lean();
    } catch (visError) {
      console.error("  [MEDIA STREAM FEED] Erreur de récupération des visuels :", visError);
    }
    try {
      tracks = await ProductModel.find({ 
         category: { $in: ['MUSIC', 'AUDIO', 'PARTITA'] } 
       }).limit(20).lean();
    } catch (trackError) {
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