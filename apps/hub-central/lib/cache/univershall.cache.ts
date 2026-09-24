// Fichier : apps/hub-central/lib/cache/univershall.cache.ts
import { UniversalMediaModel } from '@ilot/infrastructure';
import { unstable_cache } from 'next/cache';

export interface UniversHallItemResponse {
  mediaId: string;
  sourceApp: string;
  ownerUid: string;
  ownerSlug: string;
  title: string;
  mediaUrl: string;
  thumbnailUrl: string | null;
  priceCents: number;
  metadata: Record<string, unknown>;
  createdAt: Date | string;
}

interface LeanUniversalMediaDocument {
  mediaId?: string;
  sourceApp?: string;
  ownerUid?: string;
  ownerSlug?: string;
  title?: string;
  mediaUrl?: string;
  thumbnailUrl?: string | null;
  priceCents?: number;
  metadata?: Record<string, unknown>;
  createdAt?: Date | string;
  [key: string]: unknown;
}

export const getCachedUniversHallStream = async (): Promise<UniversHallItemResponse[]> => {
  const fetcher = async (): Promise<UniversHallItemResponse[]> => {
    // Récupération de tous les artefacts consentants de la canopée, triés par récence
    const rawItems = (await UniversalMediaModel.find({ consentForShowcase: true })
      .sort({ createdAt: -1 })
      .limit(60)
      .lean()) as unknown as LeanUniversalMediaDocument[];

    if (!rawItems || rawItems.length === 0) return [];

    // Sérialisation propre pour l'API
    return rawItems.map((item): UniversHallItemResponse => ({
      mediaId: String(item.mediaId || ''),
      sourceApp: String(item.sourceApp || ''),
      ownerUid: String(item.ownerUid || ''),
      ownerSlug: String(item.ownerSlug || ''),
      title: String(item.title || ''),
      mediaUrl: String(item.mediaUrl || ''),
      thumbnailUrl: (item.thumbnailUrl as string) || null,
      priceCents: (item.priceCents as number) || 0,
      metadata: (item.metadata as Record<string, unknown>) || {},
      createdAt: item.createdAt || new Date(),
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