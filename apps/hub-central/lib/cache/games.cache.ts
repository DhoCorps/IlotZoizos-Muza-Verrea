// Fichier : lib/cache/games.cache.ts
import { unstable_cache } from 'next/cache';
import { GameResultModel } from '@ilot/infrastructure';

// -------------------------------------------------------------------------
// CACHE SÉCURISÉ : Récupération du classement filtré (30s) avec bypass en mode test
// -------------------------------------------------------------------------
export async function getCachedLeaderboard(gameType: string | null, limit: number) {
  const fetcher = async () => {
    // Normalisation de la chaîne de recherche pour éviter les écarts de casse ou d'espaces
    const normalizedGameType = gameType ? gameType.trim().toLowerCase() : null;
    const query = normalizedGameType && normalizedGameType !== 'all' ? { gameType: normalizedGameType } : {};
    
    return await GameResultModel.find(query)
      .sort({ finalScore: -1, createdAt: 1 })
      .limit(limit)
      .lean();
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  const cleanGameType = gameType ? gameType.trim().toLowerCase() : 'all';
  const cacheKey = `leaderboard-${cleanGameType}-${limit}`;
  
  return await unstable_cache(
    fetcher,
    [cacheKey],
    { 
      revalidate: 30, 
      tags: ['game-leaderboard', 'games', ...(cleanGameType !== 'all' ? [`leaderboard-${cleanGameType}`] : [])] 
    }
  )();
}