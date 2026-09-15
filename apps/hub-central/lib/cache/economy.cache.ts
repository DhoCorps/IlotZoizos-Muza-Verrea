// Fichier : lib/cache/economy.cache.ts
import { unstable_cache } from 'next/cache';
import { EconomyService } from '@ilot/infrastructure';

// -------------------------------------------------------------------------
// CACHE SÉCURISÉ : Récupération de l'inventaire de l'Alvéole (avec bypass en test)
// -------------------------------------------------------------------------
export async function getCachedInventory(userUid: string) {
  const fetcher = async () => {
    if (!userUid) throw new Error("Identifiant d'oiseau requis pour ausculter l'Alvéole.");
    return await EconomyService.getInventory(userUid);
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  const cacheKey = `alveole-inventory-${userUid}`;
  
  return await unstable_cache(
    fetcher,
    [cacheKey],
    { revalidate: 30, tags: ['economy', `alveole-${userUid}`] }
  )();
}