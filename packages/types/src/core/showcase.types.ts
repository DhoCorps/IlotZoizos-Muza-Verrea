// packages/types/src/showcase.types.ts
export type UniversalMediaType = 'PARTITA' | 'LETRIN' | 'ABYSS' | 'DHO' | 'GALLERY' | 'SPRITE';

export interface IUniversalMediaItem {
  mediaId: string;
  sourceApp: UniversalMediaType;
  ownerUid: string;
  ownerSlug: string;
  title: string;
  mediaUrl: string; // URL S3 R2
  thumbnailUrl?: string;
  priceCents?: number;
  metadata?: Record<string, any>;
  consentForShowcase: boolean;
  consentForMusicSync: boolean;
  createdAt: Date;
}

export interface ShowcaseFilterOptions {
  selectedApps: UniversalMediaType[]; // Si vide, sélection totale
  onlyTradable?: boolean;
}