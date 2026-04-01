import { z } from 'zod';

// 1. Renommé pour éviter la collision avec status.types.ts
export type StatusEnum = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'ARCHIVED' | 'BLOCKED' | 'ABANDONED';

export const STATUS_CONFIG: Record<StatusEnum, { label: string, color: string }> = {
  TODO: { label: '?', color: 'gray' },
  IN_PROGRESS: { label: '...', color: 'blue' },
  DONE: { label: '!', color: 'green' },
  ARCHIVED: { label: 'M', color: 'purple' },
  BLOCKED: { label: 'B', color: 'orange' },
  ABANDONED : { label: 'X', color: 'red' }
};

// 🏗️ Le Pivot MongoDB / Neo4j
export const BaseNodeSchema = z.object({
  _id: z.string().optional(), 
  uid: z.string().uuid().optional(), 
  createdAt: z.union([z.date(), z.string()]).optional(),
  updatedAt: z.union([z.date(), z.string()]).optional(),
});

export type IBaseNode = z.infer<typeof BaseNodeSchema>;

// 📊 Constantes Globales (TRADUITES EN ANGLAIS)
export const ProjectStatusSchema = z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'PAUSED', 'REDUCED_SPEED']);
export const ProjectPrioritySchema = z.enum(['TRIVIAL', 'EASY', 'MEDIUM', 'HARD', 'EXTREME', 'CRITICAL']);

// 👉 L'EXPORT MANQUANT POUR TASKS
export const ComplexityLevelSchema = z.number().min(1).max(10).default(1);