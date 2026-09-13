// apps/hub-central/lib/cache/univershall.cache.ts
import { UniversalMediaModel } from '@ilot/infrastructure';
import { unstable_cache } from 'next/cache';

export const getCachedUniversHallStream = async () => {
  const fetcher = async () => {
    // Récupération de tous les artefacts consentants de la canopée, triés par récence
    const rawItems = await UniversalMediaModel.find({ consentForShowcase: true })
      .sort({ createdAt: -1 })
      .limit(60)
      .lean();

    if (!rawItems || rawItems.length === 0) return [];

    // Sérialisation propre pour l'API
    return rawItems.map((item: any) => ({
      mediaId: item.mediaId,
      sourceApp: item.sourceApp,
      ownerUid: item.ownerUid,
      ownerSlug: item.ownerSlug,
      title: item.title,
      mediaUrl: item.mediaUrl,
      thumbnailUrl: item.thumbnailUrl || null,
      priceCents: item.priceCents || 0,
      metadata: item.metadata || {},
      createdAt: item.createdAt,
    }));
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  return await unstable_cache(
    fetcher,
    ['univershall-stream-global'],
    { revalidate: 60, tags: ['univershall-stream', 'universal-media'] }
  )();
};