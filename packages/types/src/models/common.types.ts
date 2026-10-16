// Fichier : packages/types/src/models/common.types.ts
import { z } from 'zod';

// 1. Renommé pour éviter la collision avec status.types.ts
export type StatusEnum = 'CONCEPT' | 'TODO' | 'IN_PROGRESS' | 'DONE' | 'ARCHIVED' | 'BLOCKED' | 'ABANDONED';

export const STATUS_CONFIG: Record<StatusEnum, { label: string, color: string }> = {
  CONCEPT: { label: '0', color: 'brown' },
  TODO: { label: 'TODO', color: 'gray' },
  IN_PROGRESS: { label: '...', color: 'blue' },
  DONE: { label: '!', color: 'green' },
  ARCHIVED: { label: 'M', color: 'purple' },
  BLOCKED: { label: 'B', color: 'orange' },
  ABANDONED: { label: 'X', color: 'red' }
};

// 🌌 SOURCE UNIQUE DE VÉRITÉ (SSOT) : Cibles d'Entités & Modules de l'Îlot
export const EntityTargetEnum = z.enum([
  // --- 🏛️ ENTITÉS MÉTIER ---
  'USER',
  'TEAM',
  'PROJECT',
  'TASK',
  'FRAGMENT',
  'SUJET',
  'ARTICLE',
  'BLOG',
  'COMMENT',
  'PRODUCT',
  'STORE',
  'SHOP',
  'ORDER',
  'BARTER',
  'PARTITA',
  'SAMPLE',
  'FONT',
  'SPRITE',
  'BOOK',
  'POEM',
  'QUEST',
  'PROFILE',
  'TEMPLATE',
  'KONTRAKT',
  'SUBSIDY',
  'RAFFLE',
  'MESSAGE',
  'TAG',

  // --- 🛰️ MODULES & APPLICATIONS SOURCES ---
  'ABYSS',
  'BIBLIOTEK',
  'POETRIK',
  'SAMPLOTEK',
  'LETRIN',
  'KONTAKT',
  'DHO',
  'GALLERY',
  'GAME',
  'LYRIKA',
  'UNKNOWN'
]);

export const EntityTargetSchema = EntityTargetEnum;
export type EntityTarget = z.infer<typeof EntityTargetEnum>;

// 🏗️ Le Pivot MongoDB / Neo4j
export const BaseNodeSchema = z.object({
  _id: z.string().optional(), 
  uid: z.string().optional(), 
  createdAt: z.union([z.date(), z.string()]).optional(),
  updatedAt: z.union([z.date(), z.string()]).optional(),
});

export type IBaseNode = z.infer<typeof BaseNodeSchema>;

// 🛍️ Schéma e-commerce partagé
export const MerchLinkSchema = z.object({
  productId: z.string(),
  sku: z.string().optional(),
  displayMode: z.enum(['card', 'inline', 'banner']).default('card'),
});

export type IMerchLink = z.infer<typeof MerchLinkSchema>;

// 📊 Constantes Globales (ProjectStatusSchema supprimé d'ici pour éviter le doublon avec project.types.ts)
export const ProjectPrioritySchema = z.enum(['TRIVIAL', 'EASY', 'MEDIUM', 'HARD', 'EXTREME', 'CRITICAL']);

// 👉 L'EXPORT MANQUANT POUR TASKS
export const ComplexityLevelSchema = z.number().min(1).max(10).default(1);