// Fichier : lib/cache/demopraxy.cache.ts
import { unstable_cache } from 'next/cache';
import { OiseauModel } from '@ilot/infrastructure';
import { IlotError } from '@ilot/shared-core';

// -------------------------------------------------------------------------
// CACHE CHIRURGICAL : Récupération des métriques et rapports démopraxiques
// -------------------------------------------------------------------------
export async function getCachedDemopraxicMetrics(userIdentifier: string) {
  const fetcher = async () => {
    if (!userIdentifier) throw new Error("Identifiant d'oiseau requis pour ausculter la démopraxy.");
    
    const user = await OiseauModel.findOne({ 
      $or: [{ slug: userIdentifier }, { uid: userIdentifier }, { pseudo: userIdentifier }] 
    }).lean() as any;

    if (!user) {
      throw new Error("Oiseau introuvable dans la Silice pour auscultation démopraxique.");
    }

    return {
      uid: user.uid,
      slug: user.slug,
      sanctuaryVerrouille: user.sanctuaryVerrouille || false,
      demopraxyState: user.demopraxyState || null
    };
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  const cacheKey = `demopraxy-metrics-${userIdentifier}`;
  
  return await unstable_cache(
    fetcher,
    [cacheKey],
    { revalidate: 30, tags: ['demopraxy', `demopraxy-${userIdentifier}`] }
  )();
}