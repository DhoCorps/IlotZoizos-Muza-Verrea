// Fichier : packages/types/src/models/team.types.ts
import { z } from 'zod';
import { BaseNodeSchema } from './common.types';

/**
 * 🎭 CATÉGORIES D'EXISTENCE
 * On garde une distinction technique, mais on évite les boîtes sociales rigides.
 */
export const TeamCategorySchema = z.enum(['SOCIAL', 'SYSTEM', 'DAWN']);

export const TeamDocumentSchema = z.object({
  uid: z.string(),
  name: z.string(),
  label: z.string(),
  url: z.string(),
  mimeType: z.string(),
  // 🪡 SUTURE API : Harmonisation Date avec coerce
  createdAt: z.coerce.date().optional()
});

export const TeamInvitationSchema = z.object({
  uid: z.string(),
  targetUid: z.string(),
  inviterUid: z.string(),
  status: z.enum(['PENDING', 'ACCEPTED', 'DECLINED']).default('PENDING'),
  capabilities: z.array(z.string()).default([]),
  invitedAt: z.coerce.date().default(() => new Date()) // ⏳ Harmonisation Date avec coerce
});

export const TeamMemberSchema = z.object({
  uid: z.string(), // UID de l'oiseau
  capabilities: z.array(z.string()).default([]),
  contributionPoints: z.number().min(0).default(0),
  joinedAt: z.coerce.date().default(() => new Date()) // ⏳ Harmonisation Date avec coerce
});

export const TeamSchema = BaseNodeSchema.extend({
  // --- 🏷️ IDENTITÉ (Silice) ---
  uid: z.string(),
  name: z.string().min(3).max(50),
  description: z.string().max(500).optional(),
  
  // --- 🕸️ STRUCTURE & VIBRATION ---
  category: TeamCategorySchema.default('SOCIAL'),
  frequency: z.string().regex(/^#[0-9A-F]{6}$/i).default('#8b9dc3'), // Gris bleuté par défaut
  
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
    // Suture avec la réorganisation à vitesse réduite
    isGlobalReducedSpeed: z.boolean().default(false), 
    allowSearch: z.boolean().default(true),
    defaultLocale: z.string().default('fr'),
  }).default({ isGlobalReducedSpeed: false, allowSearch: true, defaultLocale: 'fr' }),

  // --- 🧠 RÉSILLIENCE & MODÉRATION ---
  collectiveHealth: z.object({
    lastPulseCheck: z.coerce.date().optional() // ⏳ Harmonisation Date avec coerce
  }).default({}),

  moderation: z.object({
    isFlagged: z.boolean().default(false),
    reportCount: z.number().default(0)
  }).default({ isFlagged: false, reportCount: 0 }),

  // --- 👥 RELATIONS (Silice) ---
  invitations: z.array(TeamInvitationSchema).default([]),
  members: z.array(TeamMemberSchema).default([]),

  // --- 📂 DOCUMENTS ---
  documents: z.array(TeamDocumentSchema).default([]),
  
  // 🪡 SUTURE API
  dates: z.object({
    createdAt: z.coerce.date().optional(), // ⏳ Harmonisation Date avec coerce
    updatedAt: z.coerce.date().optional(), // ⏳ Harmonisation Date avec coerce
  }).default({})
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

/**
 * 📤 PAYLOADS D'API
 */
export const FosterTeamPayloadSchema = TeamSchema.pick({
  name: true,
  description: true,
  category: true,
  frequency: true,
  isPrivate: true,
  parentId: true,
  ownerUid: true,
  leaderUid: true
}).partial({
  description: true,
  frequency: true,
  parentId: true,
  leaderUid: true
});

export type FosterTeamPayload = z.infer<typeof FosterTeamPayloadSchema>;

export const UpdateTeamPayloadSchema = TeamSchema.partial().omit({ 
  uid: true, 
  ownerUid: true 
});

export type UpdateTeamPayload = z.infer<typeof UpdateTeamPayloadSchema>;