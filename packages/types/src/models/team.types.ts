// packages/types/src/schemas/team.types.ts
import { z } from 'zod';
import { BaseNodeSchema } from './common.types';

/**
 * 🎭 CATÉGORIES D'EXISTENCE
 * On garde une distinction technique, mais on évite les boîtes sociales rigides.
 */
export const TeamCategorySchema = z.enum(['SOCIAL', 'SYSTEM', 'DAWN']);

export const TeamSchema = BaseNodeSchema.extend({
  // --- 🏷️ IDENTITÉ (Silice) ---
  uid: z.string(),
  name: z.string().min(3).max(50),
  description: z.string().max(500).optional(),
  
  // --- 🕸️ STRUCTURE & VIBRATION ---
  category: TeamCategorySchema.default('SOCIAL'),
  frequency: z.string().regex(/^#[0-9A-F]{6}$/i).default('#8b9dc3'), // Gris bleuté par défaut [cite: 2026-03-27]
  
  // Identifiants uniques de souveraineté
  ownerUid: z.string(), 
  leaderUid: z.string().nullable().optional(), // Un point de contact technique, pas un rang social
  parentId: z.string().nullable().optional(), 
  isPrivate: z.boolean().default(true),

  // --- ⚖️ GOUVERNANCE (Le flux du nid) ---
  governance: z.object({
    // On définit le mode de décision, pas qui donne des ordres
    votingSystem: z.enum(['DEMOCRATIC', 'AUTOCRATIC', 'CONSENSUS']).default('DEMOCRATIC'),
    allowMemberInvite: z.boolean().default(true),
  }).default({}),

  // --- ⚙️ RÉGLAGES SYSTÈME (L'Horlogerie) ---
  settings: z.object({
    // Suture avec la réorganisation à vitesse réduite [cite: 2026-03-11]
    isGlobalReducedSpeed: z.boolean().default(false), 
    allowSearch: z.boolean().default(true),
    defaultLocale: z.string().default('fr'),
  }).default({ isGlobalReducedSpeed: false, allowSearch: true, defaultLocale: 'fr' }),

  // --- 🧠 RÉSILLIENCE & MODÉRATION [cite: 2026-02-11] ---
  collectiveHealth: z.object({
    lastPulseCheck: z.date().optional()
  }).default({}),

  moderation: z.object({
    isFlagged: z.boolean().default(false),
    reportCount: z.number().default(0)
  }).default({ isFlagged: false, reportCount: 0 }),

  // TODO
  invitations:z.array(z.object({})),
  members:z.array(z.object({})),

  documents: z.array(z.object({
      uid: z.string(),
      name: z.string(),
      label: z.string(),
      url: z.string(),
      mimeType: z.string()
  })).default([])

});

export type ITeam = z.infer<typeof TeamSchema>;

/**
 * 🛡️ LA RELATION DE NIDIFICATION (Neo4j)
 * C'est ici que l'absurdité du rôle est remplacée par la fluidité de l'Aura.
 */
export interface INestingRelation {
  since: Date;
  // 🕊️ SUTURE : On ne stocke plus de "role" figé, mais l'aura (capabilities)
  capabilities: string[]; 
  contributionPoints: number; // Score de sédimentation (activité réelle dans ce nid)
}