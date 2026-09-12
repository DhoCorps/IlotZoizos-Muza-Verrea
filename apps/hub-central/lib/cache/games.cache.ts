// Fichier : lib/cache/games.cache.ts
import { unstable_cache } from 'next/cache';
import { GameResultModel } from '@ilot/infrastructure';

// -------------------------------------------------------------------------
// CACHE SÉCURISÉ : Récupération du classement filtré (30s) avec bypass en mode test[cite: 15]
// -------------------------------------------------------------------------
export async function getCachedLeaderboard(gameType: string | null, limit: number) {
  const fetcher = async () => {
    const query = gameType && gameType !== 'all' ? { gameType } : {};
    return await GameResultModel.find(query)
      .sort({ score: -1 })
      .limit(limit)
      .lean();
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  const cacheKey = `leaderboard-${gameType || 'all'}-${limit}`;
  return await unstable_cache(
    fetcher,
    [cacheKey],
    { 
      revalidate: 30, 
      tags: ['leaderboard', 'games', ...(gameType && gameType !== 'all' ? [`leaderboard-${gameType}`] : [])] 
    }
  )();
}