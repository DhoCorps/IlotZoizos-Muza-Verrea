// Fichier : packages/types/src/core/showcase.types.ts
import type { SourceApp } from './universalMedia.types';

export interface IUniversalMediaItem {
  mediaId: string;
  sourceApp: SourceApp; // 🌟 Aligné sur la SSOT EntityTarget via SourceApp
  ownerUid: string;
  ownerSlug: string;
  title: string;
  mediaUrl: string; // URL S3 R2
  thumbnailUrl?: string;
  priceCents?: number;
  metadata?: Record<string, unknown>;
  consentForShowcase: boolean;
  consentForMusicSync: boolean;
  createdAt: Date;
}

export interface ShowcaseFilterOptions {
  selectedApps: SourceApp[]; // 🌟 Aligné avec le schéma Zod SSOT
  onlyTradable?: boolean;
}