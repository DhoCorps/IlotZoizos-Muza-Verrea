import { z } from 'zod';
// 1. On importe les schémas déjà existants pour éviter le conflit
import { 
  BaseNodeSchema, 
  ProjectStatusSchema, 
  ProjectPrioritySchema 
} from './common.types'; 

// --- 🎭 ÉNUMÉRATIONS RESTANTES (Si non présentes dans common.types) ---

export const ProjectCategorySchema = z.enum([
  'TECHNICAL', 'ARTISTIC', 'SOCIAL', 'COMMERCIAL', 'RESEARCH', 'OPEN_SOURCE', 'PERSONAL'
]);

export const ProjectVisibilitySchema = z.enum(['PUBLIC', 'INTERNAL', 'PRIVATE', 'SECRET']);

// --- 🏗️ LE SCHÉMA GARGANTUESQUE ---

export const ProjectSchema = BaseNodeSchema.extend({
  // --- 🏷️ IDENTITÉ ET HIÉRARCHIE ---
  name: z.string().min(3).max(100),
  tag: z.string().min(2).max(10).optional(), // ex: [RENEWALL]
  description: z.string().max(2000).optional(),
  
  // 🔗 PROJETS DE PROJETS (Récursivité)
  parentId: z.string().nullable().optional(), 
  ownerId: z.string(), // L'oiseau ou le nid propriétaire
  managerId: z.string().optional(), // Le responsable direct
  teamIds: z.array(z.string()).default([]), // Les nids affectés au projet

  // --- 🎨 APPARENCE & THEME (Inspiré de page.tsx) ---
  appearance: z.object({
    icon: z.string().default('folder'),
    color: z.string().default('#E5484D'), // Ton rouge organique par défaut
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

  // --- 📂 GESTION DES FICHIERS (Ta demande spécifique) ---
  fileUploads: z.array(z.string().url()).default([]), // Tableau d'URLs des fichiers uploadés
  
  // --- 🎯 OBJECTIFS & AVANCEMENT (Milestones) ---
  roadmap: z.object({
    progress: z.number().min(0).max(100).default(0),
    milestones: z.array(z.object({
      id: z.string(),
      label: z.string(),
      isCompleted: z.boolean().default(false),
      dueDate: z.date().optional(),
      weight: z.number().default(1), // Influence sur le progress total
    })).default([]),
    kpis: z.array(z.object({
      label: z.string(),
      target: z.number(),
      current: z.number().default(0),
      unit: z.string().optional()
    })).default([]),
  }).default({}),

  // --- 💰 ÉCONOMIE & RESSOURCES (Détails réels) ---
  financials: z.object({
    budget: z.object({
      estimated: z.number().default(0),
      spent: z.number().default(0),
      currency: z.string().default('EUR'),
    }).optional(),
    fundingSources: z.array(z.string()).default([]),
    isMonetized: z.boolean().default(false),
  }).optional(),

  infrastructure: z.object({
    tools: z.array(z.string()).default([]), // ex: ["Next.js", "Neo4j", "Tailwind"]
    physicalLocation: z.string().optional(), // Si projet IRL
    hardwareRequirements: z.array(z.string()).default([]),
  }).default({}),

  // --- 🧠 SANTÉ COLLECTIVE & RISQUES (Logique Team) ---
  health: z.object({
    complexityLevel: z.number().min(1).max(10).default(5),
    averageMentalLoad: z.number().min(0).max(100).default(0), // Repris de team.types.ts
    riskLevel: z.enum(['SAFE', 'STABLE', 'WARNING', 'CRITICAL']).default('SAFE'),
    mitigationPlans: z.array(z.string()).default([]),
  }).default({}),

  // --- ⚖️ GOUVERNANCE & DROITS ---
  governance: z.object({
    isOpenSource: z.boolean().default(false),
    license: z.string().default('MIT'),
    allowSubProjects: z.boolean().default(true),
    restrictedAccess: z.boolean().default(false),
  }).default({}),

  // --- 🛡️ MODÉRATION ---
  moderation: z.object({
    isFlagged: z.boolean().default(false),
    reportCount: z.number().default(0),
    internalNotes: z.string().optional(),
  }).default({})
});

export type IProject = z.infer<typeof ProjectSchema>;

// --- 🔗 RELATIONS DE CONTRIBUTION ---
export interface IProjectContribution {
  userId: string;
  projectId: string;
  role: string; // ex: "Lead Dev", "Designer", "Tester"
  since: Date;
  effortHours: number;
  impactScore: number; // 0-100
}