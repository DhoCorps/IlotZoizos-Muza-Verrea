import { z } from 'zod';

// --- 🔍 SCHEMA SEO PARTAGÉ ---
export const SeoMetadataSchema = z.object({
  metaTitle: z.string().max(60, "Idéalement moins de 60 caractères").optional(),
  metaDescription: z.string().max(160, "Idéalement entre 150 et 160 caractères").optional(),
  ogImageUrl: z.string().optional(),
  canonicalUrl: z.string().url("URL canonique invalide").optional(),
});

// --- 🌐 SCHEMA CROSS-LINKS PARTAGÉ (LE GRAPH) ---
export const EntityTypeSchema = z.enum(['BLOG', 'PROJECT', 'FONT', 'SPRITE', 'PROFILE', 'GAME']);

export const CrossLinkSchema = z.object({
  entityType: EntityTypeSchema,
  entityId: z.string(),
  label: z.string().optional()
});

// --- 🖼️ SCHEMA MÉDIAS & ACCESSIBILITÉ PARTAGÉ ---
export const SharedMediaSchema = z.object({
  coverImageUrl: z.string().optional(),
  coverImageAlt: z.string().optional(), // Accessibilité SEO
  audioTrackUrl: z.string().optional(),
  audioTitle: z.string().optional(),
});