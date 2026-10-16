// Fichier : packages/types/src/models/project.types.ts
import { z } from 'zod';
import { 
  BaseNodeSchema, 
  ProjectPrioritySchema,
  StatusEnum 
} from './common.types'; 
import { CurrencyEnum } from '../core/economy.types';

/**
 * 🎭 CATÉGORIES D'INTENTION
 */
export const ProjectCategorySchema = z.enum([
  'TECHNICAL', 'ARTISTIC', 'SOCIAL', 'COMMERCIAL', 'RESEARCH', 'OPEN_SOURCE', 'PERSONAL'
]);

export const ProjectVisibilitySchema = z.enum(['PUBLIC', 'INTERNAL', 'PRIVATE', 'SECRET', 'OPEN_SOURCE']);

// 🌟 Définition propre et unique de ProjectStatusSchema pour les chantiers
export const ProjectStatusSchema = z.enum([
  'CONCEPT', 'TODO', 'IN_PROGRESS', 'DONE', 'ARCHIVED', 'BLOCKED', 'ABANDONED'
]);

export const ProjectDocumentSchema = z.object({
  uid: z.string(),
  name: z.string(),
  label: z.string(),
  url: z.string(),
  mimeType: z.string(),
  createdAt: z.coerce.date().default(() => new Date())
});

export type IProjectDocument = z.infer<typeof ProjectDocumentSchema>;

/**
 * 🏗️ LE SCHÉMA DU CHANTIER
 */
export const ProjectSchema = BaseNodeSchema.extend({
  uid: z.string(),
  name: z.string().min(3).max(100),
  slug: z.string(), 
  tag: z.string().min(2).max(10).optional(), 
  description: z.string().max(2000).optional(),
  
  parentId: z.string().nullable().optional(), 
  ownerUid: z.string(), 
  creatorUid: z.string(), 
  guardianUid: z.string().optional(),
  teamIds: z.array(z.string()).default([]),

  appearance: z.object({
    icon: z.string().default('folder'),
    color: z.string().default('#8b9dc3'),
    bannerUrl: z.string().url().optional(),
    avatarUrl: z.string().url().optional(),
  }).default({}),

  status: ProjectStatusSchema.default('CONCEPT'),
  priority: ProjectPrioritySchema.default('MEDIUM'),
  category: ProjectCategorySchema.default('TECHNICAL'),
  visibility: ProjectVisibilitySchema.default('PRIVATE'),
  
  dates: z.object({
    start: z.coerce.date().optional(),
    deadline: z.coerce.date().optional(),
    completedAt: z.coerce.date().optional(),
    lastActivity: z.coerce.date().default(() => new Date()),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional()
  }).default({}),

  documents: z.array(ProjectDocumentSchema).default([]),
  
  roadmap: z.object({
    progress: z.number().min(0).max(100).default(0),
    milestones: z.array(z.object({
      id: z.string(),
      label: z.string(),
      isCompleted: z.boolean().default(false),
      dueDate: z.coerce.date().optional(),
      weight: z.number().default(1),
    })).default([]),
    vibrations: z.array(z.object({
      label: z.string(),
      target: z.number(),
      current: z.number().default(0),
      unit: z.string().optional()
    })).default([]),
  }).default({}),

  energySap: z.object({
    resourceFlow: z.object({
      estimated: z.number().default(0),
      spent: z.number().default(0),
      currency: CurrencyEnum.default('EURO'),
    }).optional(),
    sources: z.array(z.string()).default([]),
    isMonetized: z.boolean().default(false),
  }).optional(),

  infrastructure: z.object({
    tools: z.array(z.string()).default([]),
    physicalLocation: z.string().optional(),
    hardwareRequirements: z.array(z.string()).default([]),
  }).default({}),

  health: z.object({
    complexityLevel: z.number().min(1).max(10).default(5),
    riskLevel: z.enum(['SAFE', 'STABLE', 'WARNING', 'CRITICAL']).default('SAFE'),
    mitigationPlans: z.array(z.string()).default([]),
  }).default({}),

  governance: z.object({
    isOpenSource: z.boolean().default(false),
    license: z.string().default('MIT'),
    allowSubProjects: z.boolean().default(true),
    restrictedAccess: z.boolean().default(false),
  }).default({}),

  moderation: z.object({
    isFlagged: z.boolean().default(false),
    internalNotes: z.string().optional(),
  }).default({})
});

export type IProject = z.infer<typeof ProjectSchema>;

export const ProjectContributionSchema = z.object({
  userUid: z.string(),
  projectUid: z.string(),
  since: z.coerce.date(),
  effortHours: z.number().min(0),
});

export type IProjectContribution = z.infer<typeof ProjectContributionSchema>;

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