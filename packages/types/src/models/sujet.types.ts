import { z } from 'zod';
import { SeoMetadataSchema, CrossLinkSchema, SharedMediaSchema } from '../core/seo.types';

// ==========================================
// 1. ÉNUMÉRATIONS
// ==========================================
export const SujetCategorySchema = z.enum([
  'MONOLOGUE', 
  'POETRY', 
  'TUTORIAL', 
  'LORE', 
  'MANIFESTO'
]);

export const SujetStatusSchema = z.enum([
  'DRAFT', 
  'PUBLISHED', 
  'ARCHIVED'
]);

// ==========================================
// 2. LE SCHÉMA PRINCIPAL ZOD (ULTIMATE & DRY EDITION)
// ==========================================
export const SujetSchema = z.object({
  uid: z.string(),
  
  // --- IDENTITÉ & CONTENU ---
  title: z.string().min(1, "Le titre est requis"),
  slug: z.string().min(1, "Le slug est requis"),
  subtitle: z.string().optional(),
  excerpt: z.string().max(300, "L'extrait ne doit pas dépasser 300 caractères").optional(),
  content: z.string().min(1, "Le contenu est requis"),
  
  // --- CHAMPS LITTÉRAIRES & JURIDIQUES ---
  lyrics: z.string().optional(),
  copyright: z.string().optional(),
  
  authorUid: z.string(),

  // --- VIBRATION, TEMPS & ÉTAT ---
  category: SujetCategorySchema.default('MONOLOGUE'),
  status: SujetStatusSchema.default('DRAFT'),
  tags: z.array(z.string()).default([]),
  
  publishedAt: z.string().datetime().optional(),
  readingTimeMinutes: z.number().default(1),    

  // --- 🔍 OPTIMISATION SEO (Mutualisé) ---
  seo: SeoMetadataSchema.default({}),

  // --- 🌐 LE TISSU CONNECTEUR (Mutualisé) ---
  connections: z.object({
    relatedProjects: z.array(z.string()).default([]),
    relatedTasks: z.array(z.string()).default([]),
    relatedProducts: z.array(z.string()).default([]),
    relatedGames: z.array(z.string()).default([]),
    crossLinks: z.array(CrossLinkSchema).default([])
  }).default({}),

  // 🛍️ SUTURE E-COMMERCE
  merchLink: z.object({
    productId: z.string().optional(),
    sku: z.string().optional(),
    displayMode: z.string().default('card')
  }).optional(),

  // --- 🖼️ MÉDIAS & ANCRAGES SENSORIELS (Mutualisé) ---
  media: SharedMediaSchema.optional(),

  // --- GOUVERNANCE & MODÉRATION ---
  settings: z.object({
    allowComments: z.boolean().default(true),
    allowEmojiReactions: z.boolean().default(true),
    isAgeRestricted: z.boolean().default(false),
    alchemicalTransmuted: z.boolean().default(false)
  }).default({}),

  // --- STATISTIQUES ---
  resonance: z.object({
    views: z.number().default(0),
    readsCompleted: z.number().default(0)
  }).default({})
});

export type ISujet = z.infer<typeof SujetSchema>;
export type SujetCategory = z.infer<typeof SujetCategorySchema>;
export type SujetStatus = z.infer<typeof SujetStatusSchema>;