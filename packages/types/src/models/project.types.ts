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

export const ProjectDocumentSchema = z.object({
  uid: z.string(),
  name: z.string(),
  label: z.string(),
  url: z.string(),
  mimeType: z.string(),
  // 🪡 SUTURE API : Acceptation des dates ISO (String) ou Objets Date
  createdAt: z.union([z.date(), z.string().datetime()]).default(() => new Date())
});

export type IProjectDocument = z.infer<typeof ProjectDocumentSchema>;

/**
 * 🏗️ LE SCHÉMA DU CHANTIER (Purifié et Aligné avec Neo4j)
 */
export const ProjectSchema = BaseNodeSchema.extend({
  // --- 🏷️ IDENTITÉ & RÉSONANCE ---
  uid: z.string(),
  name: z.string().min(3).max(100),
  slug: z.string(), 
  tag: z.string().min(2).max(10).optional(), 
  description: z.string().max(2000).optional(),
  
  // 🔗 ARCHITECTURE (Récursivité et Appartenance)
  parentId: z.string().nullable().optional(), 
  ownerUid: z.string(), // UID du Nid (Team)
  creatorUid: z.string(), // UID de l'Architecte (Oiseau)
  guardianUid: z.string().optional(),
  teamIds: z.array(z.string()).default([]),

  // --- 🎨 APPARENCE & VIBRATION ---
  appearance: z.object({
    icon: z.string().default('folder'),
    color: z.string().default('#8b9dc3'),
    bannerUrl: z.string().url().optional(),
    avatarUrl: z.string().url().optional(),
  }).default({}),

  // --- 📊 ÉTAT & TEMPORALITÉ ---
  status: ProjectStatusSchema.default('CONCEPT'),
  priority: ProjectPrioritySchema.default('MEDIUM'),
  category: ProjectCategorySchema.default('TECHNICAL'),
  visibility: ProjectVisibilitySchema.default('PRIVATE'),
  
  // 🪡 SUTURE API : Tolérance pour la sérialisation SSR Next.js
  dates: z.object({
    start: z.union([z.date(), z.string().datetime()]).optional(),
    deadline: z.union([z.date(), z.string().datetime()]).optional(),
    completedAt: z.union([z.date(), z.string().datetime()]).optional(),
    lastActivity: z.union([z.date(), z.string().datetime()]).default(() => new Date()),
    createdAt: z.union([z.date(), z.string().datetime()]).optional(),
    updatedAt: z.union([z.date(), z.string().datetime()]).optional()
  }).default({}),

  // --- 📂 SÉDIMENTATION (Fichiers & Documents) ---
  documents: z.array(ProjectDocumentSchema).default([]),
  
  // --- 🎯 FEUILLE DE ROUTE (Repères factuels) ---
  roadmap: z.object({
    progress: z.number().min(0).max(100).default(0),
    milestones: z.array(z.object({
      id: z.string(),
      label: z.string(),
      isCompleted: z.boolean().default(false),
      dueDate: z.union([z.date(), z.string().datetime()]).optional(),
      weight: z.number().default(1),
    })).default([]),
    vibrations: z.array(z.object({
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
    tools: z.array(z.string()).default([]),
    physicalLocation: z.string().optional(),
    hardwareRequirements: z.array(z.string()).default([]),
  }).default({}),

  // --- 🧠 COMPLEXITÉ & RISQUES ---
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

  // --- 🛡️ SÉCURITÉ DU SANCTUAIRE ---
  moderation: z.object({
    isFlagged: z.boolean().default(false),
    internalNotes: z.string().optional(),
  }).default({})
});

export type IProject = z.infer<typeof ProjectSchema>;

/**
 * 🔗 RÉSONANCE DE CONTRIBUTION (Schéma Zod)
 */
export const ProjectContributionSchema = z.object({
  userUid: z.string(),
  projectUid: z.string(),
  since: z.union([z.date(), z.string().datetime()]),
  effortHours: z.number().min(0),
});

export type IProjectContribution = z.infer<typeof ProjectContributionSchema>;

/**
 * 📤 PAYLOADS D'API : Vues partielles du schéma
 */
export const FosterProjectPayloadSchema = ProjectSchema.pick({
  name: true,
  slug: true,
  description: true,
  ownerUid: true,
  parentId: true,
  priority: true,
  category: true,
  visibility: true,
  documents: true
}).partial({
  slug: true,
  description: true,
  parentId: true,
  priority: true,
  category: true,
  visibility: true,
  documents: true
});

export type FosterProjectPayload = z.infer<typeof FosterProjectPayloadSchema>;

export const UpdateProjectPayloadSchema = ProjectSchema.partial().omit({ uid: true, ownerUid: true, creatorUid: true });
export type UpdateProjectPayload = z.infer<typeof UpdateProjectPayloadSchema>;