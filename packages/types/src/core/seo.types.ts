// Fichier : packages/types/src/core/seo.types.ts
import { z } from 'zod';
import { EntityTargetEnum, EntityTarget } from '../models/common.types';

// --- 🔍 SCHEMA SEO PARTAGÉ (Enrichi pour Bibliotek) ---
export const SeoMetadataSchema = z.object({
  metaTitle: z.string().max(60, "Idéalement moins de 60 caractères").optional(),
  metaDescription: z.string().max(160, "Idéalement entre 150 et 160 caractères").optional(),
  ogImageUrl: z.string().optional(),
  canonicalUrl: z.string().url("URL canonique invalide").optional(),
  
  // 📚 Métadonnées spécifiques aux ouvrages (OpenGraph Article & Book)
  ogType: z.enum(['website', 'article', 'book']).optional().default('website'),
  articleAuthor: z.string().optional(),
  publishedTime: z.string().datetime().optional(),
});

// Type inféré à utiliser dans les interfaces TS
export type ISeoMetadata = z.infer<typeof SeoMetadataSchema>;

// --- 🌐 SCHEMA CROSS-LINKS PARTAGÉ (LE GRAPH - Aligné sur la SSOT EntityTargetEnum) ---
export const EntityTypeSchema = EntityTargetEnum;
export type EntityType = EntityTarget;

export const CrossLinkSchema = z.object({
  entityType: EntityTargetEnum,
  entityId: z.string(),
  label: z.string().optional()
});

export type ICrossLink = z.infer<typeof CrossLinkSchema>;

// --- 🖼️ SCHEMA MÉDIAS & ACCESSIBILITÉ PARTAGÉ ---
export const SharedMediaSchema = z.object({
  coverImageUrl: z.string().optional(),
  coverImageAlt: z.string().optional(), // Accessibilité SEO
  audioTrackUrl: z.string().optional(),
  audioTitle: z.string().optional(),
});

export type ISharedMedia = z.infer<typeof SharedMediaSchema>;