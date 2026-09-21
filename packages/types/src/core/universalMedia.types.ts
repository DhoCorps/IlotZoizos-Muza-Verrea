import { z } from 'zod';

// 1. Types de médias et Provenance
export const MediaTypeEnum = z.enum([
  'IMAGE', 
  'AUDIO_TRACK', 
  'AUDIO_STEM', 
  'TEXT'
]);
export type MediaType = z.infer<typeof MediaTypeEnum>;

export const SourceAppEnum = z.enum([
  'PARTITA', 
  'LETRIN', 
  'ABYSS',
  'BIBLIOTEK', 
  'DHO', 
  'GALLERY', 
  'SPRITE',
  'UNKNOWN'
]);
export type SourceApp = z.infer<typeof SourceAppEnum>;

// 2. Multilinguisme
export const MultilingualTextSchema = z.object({
  fr: z.string().min(1, "Le texte en français est requis."),
  en: z.string().optional(),
});

// 3. Souveraineté & E-commerce (La fusion)
export const MediaRightsSchema = z.object({
  // Souveraineté de base
  allow_radio: z.boolean().default(false),
  allow_lyrika: z.boolean().default(false),
  allow_remix: z.boolean().default(false),
  // Économie & Visibilité
  allow_commercial: z.boolean().default(false),
  consentForShowcase: z.boolean().default(false),
  consentForMusicSync: z.boolean().default(false),
});

// 🛡️ 3.b Schéma des permissions de studio (Samplotek / Partita)
export const StudioPermissionsSchema = z.object({
  allowShowcase: z.boolean().default(false),
  allowRadio: z.boolean().default(false),
}).partial();

export type StudioPermissions = z.infer<typeof StudioPermissionsSchema>;

// 🛡️ 3.c Schéma typé pour les métadonnées (Remplace le record z.any() flou)
export const MediaMetadataSchema = z.object({
  isStudioProject: z.boolean().optional(),
  usedSampleUids: z.array(z.string()).optional(),
  permissions: StudioPermissionsSchema.optional(),
}).catchall(z.unknown()); // Permet d'accepter d'autres propriétés dynamiques si besoin

export type MediaMetadata = z.infer<typeof MediaMetadataSchema>;

// 4. L'Asset Universel Complet
export const UniversalMediaSchema = z.object({
  _id: z.string().optional(),
  mediaId: z.string().optional(), // Si on veut générer notre propre UUID
  
  creatorUid: z.string().min(1, "L'ID de l'Oiseau créateur est requis"),
  creatorSlug: z.string().optional(), // Très utile pour les URLs SEO
  
  sourceApp: SourceAppEnum.default('UNKNOWN'),
  type: MediaTypeEnum,
  
  title: MultilingualTextSchema,
  description: MultilingualTextSchema.optional(),
  
  fileUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  mimeType: z.string().min(1),
  sizeBytes: z.number().positive(),
  
  priceCents: z.number().nonnegative().default(0), // E-commerce prêt !
  metadata: MediaMetadataSchema.default({}), // Typage rigoureux et sécurisé
  
  rights: MediaRightsSchema.default({}),
  
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type UniversalMedia = z.infer<typeof UniversalMediaSchema>;

export const UploadMediaInputSchema = UniversalMediaSchema.omit({
  _id: true,
  mediaId: true,
  fileUrl: true,
  thumbnailUrl: true,
  mimeType: true,
  sizeBytes: true,
  createdAt: true,
  updatedAt: true,
});
export type UploadMediaInput = z.infer<typeof UploadMediaInputSchema>;