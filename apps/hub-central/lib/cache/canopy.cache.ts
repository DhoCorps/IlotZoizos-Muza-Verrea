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
  const performer = async () => {
    return await CanopySubsidyOrchestrator.voteForSubsidy(subsidyId, userId);
  };
  if (process.env.NODE_ENV === 'test') {
    return await performer();
  }
  const cachedAction = unstable_cache(
    performer,
    ['canopy-subsidy-vote-action'],
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
  const query = yearMonth ? { yearMonth } : {};
  const fetcher = async () => {
    return await CanopyAwardModel.find(query).sort({ createdAt: -1 }).lean().exec();
  };
  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }
  return await unstable_cache(
    fetcher,
    [`canopy-awards-${yearMonth || 'all'}`],
    { revalidate: 1800, tags: ['canopy-awards'] }
  )();
}