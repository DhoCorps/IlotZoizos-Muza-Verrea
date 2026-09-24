import { z } from 'zod';
import { SeoMetadataSchema, CrossLinkSchema, SharedMediaSchema } from '../core/seo.types';

// ==========================================
// 0. COPYRIGHT & RÔLES ARTISTIQUES (DRY)
// ==========================================
export const CopyrightRoleSchema = z.enum(['CREATOR', 'SUBLIMATOR', 'CURATOR']);

export const CopyrightMetadataSchema = z.object({
  role: CopyrightRoleSchema.default('CREATOR'),
  originalAuthor: z.string().optional(),
  originalWorkTitle: z.string().optional(),
  sublimationNotes: z.string().optional(),
  isExclusiveIlot: z.boolean().default(false)
});

// ==========================================
// 1. ÉNUMÉRATIONS & TYPES DE CONNEXIONS
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

// Harmonisation complète des types d'entités pour le graphe (CrossLinks)
export const ExtendedEntityTypeSchema = z.enum([
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

export const ExtendedCrossLinkSchema = CrossLinkSchema.extend({
  entityType: ExtendedEntityTypeSchema
});

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
  copyrightMetadata: CopyrightMetadataSchema.default({}), // 🚀 Intégration DRY du Copyright unifié
  
  authorUid: z.string(),

  // --- VIBRATION, TEMPS & ÉTAT ---
  category: SujetCategorySchema.default('MONOLOGUE'),
  status: SujetStatusSchema.default('DRAFT'),
  tags: z.array(z.string()).default([]),
  
  publishedAt: z.string().datetime().optional(),
  readingTimeMinutes: z.number().default(1),    

  // --- 🔍 OPTIMISATION SEO (Mutualisé) ---
  seo: SeoMetadataSchema.default({}),

  // --- 🌐 LE TISSU CONNECTEUR (Mutualisé - Les defaults garantissent l'objet complet) ---
  connections: z.object({
    relatedProjects: z.array(z.string()).default([]),
    relatedTasks: z.array(z.string()).default([]),
    relatedProducts: z.array(z.string()).default([]),
    relatedGames: z.array(z.string()).default([]),
    crossLinks: z.array(ExtendedCrossLinkSchema).default([])
  }).default({}),

  // 🛍️ SUTURE E-COMMERCE
  merchLink: z.object({
    productId: z.string().optional(),
    sku: z.string().optional(),
    displayMode: z.string().default('card')
  }).optional(),

  // --- 🖼️ MÉDIAS & ANCRAGES SENSORIELS (Mutualisé) ---
  media: SharedMediaSchema.optional(),

  // --- GOUVERNANCE & MODÉRATION (Mutualisé - Les defaults garantissent l'objet complet) ---
  settings: z.object({
    allowComments: z.boolean().default(true),
    allowEmojiReactions: z.boolean().default(true),
    allowPropagation: z.boolean().default(true), 
    isAgeRestricted: z.boolean().default(false),
    alchemicalTransmuted: z.boolean().default(false)
  }).default({}),

  // --- STATISTIQUES DE BASE ---
  resonance: z.object({
    views: z.number().default(0),
    readsCompleted: z.number().default(0)
  }).default({}),

  // --- 🌊 PROPAGATION & VIRALITÉ ORGANIQUE ---
  propagation: z.object({
    shareCount: z.number().default(0),
    uniquePasseurs: z.number().default(0),
    globalReach: z.number().default(0)
  }).default({}),

  // --- 🌟 EXTENSIONS KOSMIQUES (Commentaires, SEO Fraîcheur & Gacha Karmique) ---
  kosmicBoon: z.object({
    interactionCount: z.number().default(0),
    nextKosmicBoon: z.number().default(42) 
  }).default({}),

  lastCommentedAt: z.string().datetime().optional(), 
});

export type ISujet = z.infer<typeof SujetSchema>;
export type SujetCategory = z.infer<typeof SujetCategorySchema>;
export type SujetStatus = z.infer<typeof SujetStatusSchema>;
export type CopyrightRole = z.infer<typeof CopyrightRoleSchema>;
export type CopyrightMetadata = z.infer<typeof CopyrightMetadataSchema>;