// packages/types/src/schemas/project.types.ts
import { z } from 'zod';
import { 
  BaseNodeSchema, 
  ProjectStatusSchema, 
  ProjectPrioritySchema 
} from './common.types'; 

/**
 * 🎭 CATÉGORIES D'INTENTION
 */
export const ProjectCategorySchema = z.enum([
  'TECHNICAL', 'ARTISTIC', 'SOCIAL', 'COMMERCIAL', 'RESEARCH', 'OPEN_SOURCE', 'PERSONAL'
]);

export const ProjectVisibilitySchema = z.enum(['PUBLIC', 'INTERNAL', 'PRIVATE', 'SECRET', 'OPEN_SOURCE']);

/**
 * 🏗️ LE SCHÉMA DU CHANTIER (Purifié)
 */
export const ProjectSchema = BaseNodeSchema.extend({
  // --- 🏷️ IDENTITÉ & RÉSONANCE ---
  name: z.string().min(3).max(100),
  slug: z.string(), 
  tag: z.string().min(2).max(10).optional(), 
  description: z.string().max(2000).optional(),
  
  // 🔗 ARCHITECTURE (Récursivité)
  parentId: z.string().nullable().optional(), 
  ownerUid: z.string(),
  creatorUid: z.string(), // Le propriétaire (Oiseau ou Nid)
  guardianUid: z.string().optional(), // Le Gardien (anciennement managerId) [cite: 2026-02-11]
  teamIds: z.array(z.string()).default([]), // Les nids en résonance sur ce chantier

  // --- 🎨 APPARENCE & VIBRATION [cite: 2026-03-27] ---
  appearance: z.object({
    icon: z.string().default('folder'),
    color: z.string().default('#8b9dc3'), // Gris bleuté privilégié [cite: 2026-03-27]
    bannerUrl: z.string().url().optional(),
    avatarUrl: z.string().url().optional(),
  }).default({}),

  // --- 📊 ÉTAT & TEMPORALITÉ ---
  status: ProjectStatusSchema.default('CONCEPT'),
  priority: ProjectPrioritySchema.default('MEDIUM'),
  category: ProjectCategorySchema.default('TECHNICAL'),
  visibility: ProjectVisibilitySchema.default('PRIVATE'),
  
  dates: z.object({
    start: z.date().optional(),
    deadline: z.date().optional(),
    completedAt: z.date().optional(),
    lastActivity: z.date().default(() => new Date()),
  }).default({}),

  // --- 📂 SÉDIMENTATION (Fichiers) ---
  fileUploads: z.array(z.string().url()).default([]), 
  
  // --- 🎯 FEUILLE DE ROUTE (Repères factuels) ---
  roadmap: z.object({
    progress: z.number().min(0).max(100).default(0),
    milestones: z.array(z.object({
      id: z.string(),
      label: z.string(),
      isCompleted: z.boolean().default(false),
      dueDate: z.date().optional(),
      weight: z.number().default(1),
    })).default([]),
    vibrations: z.array(z.object({ // Remplacement des KPIs industriels
      label: z.string(),
      target: z.number(),
      current: z.number().default(0),
      unit: z.string().optional()
    })).default([]),
  }).default({}),

  // --- 🌳 LA SÈVE (Énergie & Ressources) ---
  energySap: z.object({
    resourceFlow: z.object({
      estimated: z.number().default(0),
      spent: z.number().default(0),
      currency: z.string().default('EUR'),
    }).optional(),
    sources: z.array(z.string()).default([]),
    isMonetized: z.boolean().default(false),
  }).optional(),

  infrastructure: z.object({
    tools: z.array(z.string()).default([]), // ex: ["Next.js", "Neo4j", "Tailwind"]
    physicalLocation: z.string().optional(),
    hardwareRequirements: z.array(z.string()).default([]),
  }).default({}),

  // --- 🧠 COMPLEXITÉ & RISQUES [cite: 2026-02-11] ---
  health: z.object({
    complexityLevel: z.number().min(1).max(10).default(5),
    riskLevel: z.enum(['SAFE', 'STABLE', 'WARNING', 'CRITICAL']).default('SAFE'),
    mitigationPlans: z.array(z.string()).default([]),
  }).default({}),

  // --- ⚖️ GOUVERNANCE SOUVERAINE ---
  governance: z.object({
    isOpenSource: z.boolean().default(false),
    license: z.string().default('MIT'),
    allowSubProjects: z.boolean().default(true),
    restrictedAccess: z.boolean().default(false),
  }).default({}),

  // --- 🛡️ SÉCURITÉ DU SANCTUAIRE [cite: 2026-02-11] ---
  moderation: z.object({
    isFlagged: z.boolean().default(false),
    internalNotes: z.string().optional(),
  }).default({})
});

export type IProject = z.infer<typeof ProjectSchema>;

/**
 * 🔗 RÉSONANCE DE CONTRIBUTION
 */
export interface IProjectContribution {
  userUid: string; // Lien avec l'Oiseau
  projectUid: string; // Lien avec le Chantier
  since: Date;
  effortHours: number; // Temps dédié (factuel)
}