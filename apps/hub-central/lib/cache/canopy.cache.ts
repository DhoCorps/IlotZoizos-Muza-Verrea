import { unstable_cache } from 'next/cache';
import { SubsidyModel, MessageModel, CanopyAwardModel, IMessageDocument } from '@ilot/infrastructure';
import { CanopySubsidyOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';

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
    // 🛡️ Correction : Utilisation de l'instance de CanopySubsidyOrchestrator et de castVote avec sa signature
    const orchestrator = new CanopySubsidyOrchestrator();
    const signature: ActionSignature = {
      actorUid: userId,
      capabilities: []
    };
    return await orchestrator.castVote(subsidyId, signature);
  };

  if (process.env.NODE_ENV === 'test') {
    return await performer();
  }

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