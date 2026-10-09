// packages/types/src/core/samplotek.types.ts

import { z } from 'zod';
import { SeoMetadataSchema } from '../core/seo.types';
import { CryptographicSealSchema } from '../core/cryptoSeal.types';

// ==========================================
// 🎵 PERMISSIONS ET MODÉRATION
// ==========================================

export const SamplePermissionsSchema = z.object({
  allowRadio: z.boolean().default(true),
  allowBlindTest: z.boolean().default(true),
  allowShowcase: z.boolean().default(true),
});

export const SampleModerationSchema = z.object({
  reportsCount: z.number().default(0),
  isQuarantined: z.boolean().default(false),
});

// ==========================================
// 💿 LE SAMPLE (Brindille Sonore)
// ==========================================

export const SampleSchema = z.object({
  uid: z.string(),
  title: z.string().min(1, "Un sample doit posséder un nom."),
  slug: z.string().min(1),
  audioUrl: z.string().url(),
  storageKey: z.string(),
  
  tempoBpm: z.number().min(40).max(300).default(120),
  musicalKey: z.string().default('C major'),
  style: z.string().default('Ambient'),
  
  authorUid: z.string(), // Harmonisé avec le reste de l'Îlot
  authorPseudo: z.string().optional(),
  
  permissions: SamplePermissionsSchema.default({ allowRadio: true, allowBlindTest: true, allowShowcase: true }),
  moderation: SampleModerationSchema.default({ reportsCount: 0, isQuarantined: false }),
  
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'BURNED', 'QUARANTINED']).default('PUBLISHED'),
  
  // 🔍 OPTIMISATION SEO
  seo: SeoMetadataSchema.default({}),

  // 📜 SCEAU CRYPTOGRAPHIQUE UNIFIÉ (Empreinte SHA-256, Filiation, Exclusivité)
  cryptoSeal: CryptographicSealSchema.optional(),

  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

// ==========================================
// 🎛 STUDIO E-JAY (Séquenceur & Mixeur)
// ==========================================

export const StudioTrackFXSchema = z.object({
  reverb: z.number().min(0).max(1).default(0),
  delay: z.number().min(0).max(1).default(0),
  filterHz: z.number().min(20).max(20000).default(20000),
});

export const StudioTrackSchema = z.object({
  id: z.number(),
  name: z.string(),
  sampleUrl: z.string().url().optional().nullable(),
  sampleUid: z.string().optional().nullable(),
  isLocked: z.boolean().default(false),
  isMuted: z.boolean().default(false),
  volume: z.number().min(0).max(1).default(0.8),
  steps: z.array(z.boolean()).default(Array(16).fill(false)), // Grille 16 pas
  fx: StudioTrackFXSchema.default({ reverb: 0, delay: 0, filterHz: 20000 }),
});

export const QuantizationLevelSchema = z.enum(['1/4', '1/8', '1/16']);

export const SequencerSettingsSchema = z.object({
  snapToGrid: z.boolean().default(true),
  quantization: QuantizationLevelSchema.default('1/16'),
  allowComments: z.boolean().default(true), // 🛡️ Voile de Catharsis
});

// ==========================================
// 🎼 L'ŒUVRE COMPLÈTE (Studio Project)
// ==========================================

export const StudioProjectSchema = z.object({
  uid: z.string(),
  title: z.string().min(1, "Une symphonie ne peut naître sans nom."),
  slug: z.string().min(1),
  bpm: z.number().min(40).max(300).default(120),
  tracks: z.array(StudioTrackSchema).default([]),
  
  authorUid: z.string(),

  settings: SequencerSettingsSchema.default({ snapToGrid: true, quantization: '1/16', allowComments: true }),
  
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'BURNED']).default('DRAFT'),

  // 🔍 OPTIMISATION SEO
  seo: SeoMetadataSchema.default({}),

  // 📜 SCEAU CRYPTOGRAPHIQUE UNIFIÉ
  cryptoSeal: CryptographicSealSchema.optional(),

  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

// ==========================================
// EXPORT DES TYPES INFERÉS
// ==========================================
export type ISamplePermissions = z.infer<typeof SamplePermissionsSchema>;
export type ISampleModeration = z.infer<typeof SampleModerationSchema>;
export type ISample = z.infer<typeof SampleSchema>;

export type IStudioTrackFX = z.infer<typeof StudioTrackFXSchema>;
export type IStudioTrack = z.infer<typeof StudioTrackSchema>;
export type QuantizationLevel = z.infer<typeof QuantizationLevelSchema>;
export type ISequencerSettings = z.infer<typeof SequencerSettingsSchema>;
export type IStudioProject = z.infer<typeof StudioProjectSchema>;