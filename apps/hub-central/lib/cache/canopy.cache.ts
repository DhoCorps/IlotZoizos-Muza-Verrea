// Fichier : lib/cache/canopy.cache.ts
import { unstable_cache } from 'next/cache';
import { SubsidyModel, MessageModel, CanopyAwardModel, IMessageDocument } from '@ilot/infrastructure';
import { CanopySubsidyOrchestrator } from '@ilot/shared-core';

// -------------------------------------------------------------------------
// 1. SUBSIDIES (Subventions)
// -------------------------------------------------------------------------
export async function getCachedSubsidies() {
  const fetcher = async () => {
    return await SubsidyModel.find({}).sort({ voteCount: -1, createdAt: -1 }).lean().exec();
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  return await unstable_cache(
    fetcher,
    ['canopy-subsidies-list'],
    { revalidate: 1800, tags: ['canopy-subsidies'] }
  )();
}

export async function executeCachedVote(subsidyId: string, userId: string) {
  if (!subsidyId || !userId) {
    throw new Error("ID de subvention et identifiant utilisateur requis pour voter.");
  }

  const performer = async () => {
    return await CanopySubsidyOrchestrator.voteForSubsidy(subsidyId, userId);
  };

  if (process.env.NODE_ENV === 'test') {
    return await performer();
  }

  // Note : Une action d'écriture/vote ne devrait pas idéalement être cachée via unstable_cache de la sorte, 
  // mais on conserve le pattern avec une clé dynamisée par vote pour éviter les collisions de cache.
  const cacheKey = `canopy-subsidy-vote-${subsidyId}-${userId}`;
  const cachedAction = unstable_cache(
    performer,
    [cacheKey],
    { revalidate: 3600, tags: ['canopy-subsidies'] }
  );
  
  return await cachedAction();
}

// -------------------------------------------------------------------------
// 2. STATS (Bilan de la Canopée)
// -------------------------------------------------------------------------
export async function getCachedCanopyStats() {
  const fetcher = async () => {
    return await MessageModel.findOne({ isSystemBroadcast: true })
      .sort({ createdAt: -1 })
      .lean<IMessageDocument>()
      .exec();
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  return await unstable_cache(
    fetcher,
    ['canopy-stats-latest'],
    { revalidate: 3600, tags: ['canopy-stats', 'messages'] }
  )();
}

// -------------------------------------------------------------------------
// 3. AWARDS (Trophées)
// -------------------------------------------------------------------------
export async function getCachedAwards(yearMonth?: string) {
  const cleanYearMonth = yearMonth ? yearMonth.trim() : 'all';
  const query = cleanYearMonth !== 'all' ? { yearMonth: cleanYearMonth } : {};

  const fetcher = async () => {
    return await CanopyAwardModel.find(query).sort({ createdAt: -1 }).lean().exec();
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  return await unstable_cache(
    fetcher,
    [`canopy-awards-${cleanYearMonth}`],
    { revalidate: 1800, tags: ['canopy-awards'] }
  )();
}