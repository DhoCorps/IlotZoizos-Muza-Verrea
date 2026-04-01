import { z } from 'zod';
import { BaseNodeSchema } from './common.types';

// 🎭 Rôles et Catégories
export const BirdRoleSchema = z.enum(['ADMIN', 'MODERATOR', 'BUILDER', 'SPECTATOR', 'GUEST']);
export const TeamCategorySchema = z.enum([
  'PROFESSIONAL', // Entreprise, Startup, Département
  'ESPORT',       // Gaming, Compétition
  'COLLECTIVE',   // Achats groupés, Co-investissement
  'SOCIAL',       // Communauté, Loisirs
  'EDUCATION',    // Étude, Recherche
  'DAWN'          // Projets spéciaux / Inclassables
]);

export const TeamSchema = BaseNodeSchema.extend({
  // --- 🏷️ IDENTITÉ DE BASE ---
  name: z.string().min(3).max(50),
  tag: z.string().min(2).max(6).optional(), // ex: [ZOIZO]
  description: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
  slogan: z.string().max(100).optional(),
  
  // --- 🕸️ STRUCTURE & HIÉRARCHIE ---
  category: TeamCategorySchema.default('SOCIAL'),
  nuances: z.array(z.string()).default([]), 
  ownerId: z.string(), 
  parentId: z.string().nullable().optional(), 
  leaderId: z.string().nullable().optional(),
  isPrivate: z.boolean().default(true),

  // --- 💼 CONTEXTE PROFESSIONNEL (Optionnel) ---
  professional: z.object({
    industry: z.string().optional(),
    companySize: z.string().optional(),
    department: z.string().optional(),
    budget: z.object({
      allocated: z.number().default(0),
      currency: z.string().default('EUR')
    }).optional(),
    tools: z.array(z.string()).default([]), // ex: ["Slack", "Figma", "Jira"]
  }).optional(),

  // --- 🎮 CONTEXTE E-SPORT (Optionnel) ---
  esport: z.object({
    mainGame: z.string().optional(),
    division: z.string().optional(),
    rank: z.string().optional(),
    achievements: z.array(z.object({
      title: z.string(),
      date: z.date()
    })).default([]),
    matchHistory: z.array(z.string()).default([]), // IDs des matchs
  }).optional(),

  // --- 🛒 CONTEXTE ACHAT COLLECTIF (Optionnel) ---
  collectiveBuy: z.object({
    targetItem: z.string().optional(),
    targetPrice: z.number().optional(),
    currentPool: z.number().default(0),
    minParticipants: z.number().default(1),
    deadline: z.date().optional(),
    status: z.enum(['OPEN', 'LOCKED', 'COMPLETED', 'CANCELLED']).default('OPEN'),
  }).optional(),

  // --- 🎯 OBJECTIFS & RESSOURCES ---
  milestones: z.array(z.object({
    label: z.string(),
    isCompleted: z.boolean().default(false),
    dueDate: z.date().optional()
  })).default([]),
  
  resources: z.array(z.object({
    label: z.string(),
    url: z.string().url(),
    type: z.enum(['DOC', 'LINK', 'TOOL', 'FINANCE'])
  })).default([]),

  // --- ⚖️ GOUVERNANCE & RÈGLES ---
  governance: z.object({
    votingSystem: z.enum(['DEMOCRATIC', 'AUTOCRATIC', 'CONSENSUS']).default('DEMOCRATIC'),
    allowMemberInvite: z.boolean().default(true),
    restrictedContent: z.boolean().default(false)
  }).default({}),

  // --- ⚙️ RÉGLAGES & VISIBILITÉ ---
  settings: z.object({
    isGlobalReducedSpeed: z.boolean().default(false),
    allowSearch: z.boolean().default(true),
    themeColor: z.string().optional(), // ex: "#ef4444"
  }).default({ isGlobalReducedSpeed: false, allowSearch: true }),

  // --- 🧠 SANTÉ & MODÉRATION ---
  collectiveHealth: z.object({
    averageMentalLoad: z.number().min(0).max(100).default(0),
    isOverloaded: z.boolean().default(false),
    lastPulseCheck: z.date().optional()
  }).default({}),

  
  

  moderation: z.object({
    isFlagged: z.boolean().default(false),
    reportCount: z.number().default(0)
  }).default({ isFlagged: false, reportCount: 0 })
});

export type ITeam = z.infer<typeof TeamSchema>;

export interface INestingRelation {
  since: Date;
  role: z.infer<typeof BirdRoleSchema>;
  nicknameInTeam?: string;
  contributionPoints: number; // Score d'activité dans ce nid précis
}