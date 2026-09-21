import { z } from 'zod';

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


// --- 🌐 SCHEMA CROSS-LINKS PARTAGÉ (LE GRAPH) ---
export const EntityTypeSchema = z.enum([
  'BLOG', 
  'PROJECT', 
  'FONT', 
  'SPRITE', 
  'PROFILE', 
  'GAME', 
  'LYRIKA', 
  'SAMPLOTEK', 
  'BIBLIOTEK', 
  'POETRIK'
]);

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