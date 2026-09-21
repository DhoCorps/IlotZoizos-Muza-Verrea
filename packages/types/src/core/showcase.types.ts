// 🛠️ CORRECTION : On importe ton type Zod (Ajuste le chemin './media.types' selon le nom réel de ton fichier contenant les schémas Zod)
import type { SourceApp } from './universalMedia.types';

export interface IUniversalMediaItem {
  mediaId: string;
  sourceApp: SourceApp; // 🌟 Le type Zod est maintenant la seule et unique source de vérité !
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
  selectedApps: SourceApp[]; // 🌟 Aligné avec le schéma Zod
  onlyTradable?: boolean;
}