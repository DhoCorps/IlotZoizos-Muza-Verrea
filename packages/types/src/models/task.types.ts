// packages/types/src/models/task.types.ts
import { z } from 'zod';

export enum TaskStatus {
  CONCEPT = 'CONCEPT',
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  BLOCKED = 'BLOCKED',
  CANCELLED = 'CANCELLED',
  REDUCED_SPEED = 'REDUCED_SPEED',
  ARCHIVED = 'ARCHIVED',
  ROMPU = 'ROMPU' // État stérile en cas de rupture de sève (It = 0)
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// 🛡️ SUTURE ZODIQUE : Schémas de validation pour la Silice
export const TaskStatusSchema = z.nativeEnum(TaskStatus);
export const TaskPrioritySchema = z.nativeEnum(TaskPriority);

export const TaskSchema = z.object({
  uid: z.string(),
  projectUid: z.string(),
  parentUid: z.string().nullable().optional(),
  creatorUid: z.string(),
  assigneeUids: z.array(z.string()),
  
  // 🏷️ L'ARCHIVE (Silice Concrète)
  content: z.object({
    title: z.string().min(1, "L'atome doit avoir un nom"),
    description: z.string().optional(),
    tags: z.array(z.string()),
    attachments: z.array(z.string())
  }),

  fileUploads: z.array(z.string()),

  status: TaskStatusSchema,
  priority: TaskPrioritySchema,

  // 🌱 LA SÈVE : Les racines et la Loi de l'Irrigation (It)
  dependencies: z.array(
    z.object({
      id: z.string(),
      status: z.number().int().min(0).max(1),
    })
  ).optional(),
  isIrrigated: z.number().optional().default(1),

  pomodoros: z.object({
    estimated: z.number().min(1),
    completed: z.number().min(0),
  }),

  metrics: z.object({
    complexity: z.number().min(1).max(10),
  }),

  documents: z.array(z.object({
    uid: z.string(),
    name: z.string(),
    label: z.string(),
    url: z.string(),
    mimeType: z.string(),
    createdAt: z.date().optional(),
  })),

  dates: z.object({
    createdAt: z.union([z.date(), z.string().datetime()]),
    updatedAt: z.union([z.date(), z.string().datetime()]),
    deadline: z.union([z.date(), z.string().datetime()]).optional(),
    scheduledAt: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  }),
});

// 🔄 INFERENCE : Génération automatique du type TypeScript depuis le schéma Zod
export type ITask = z.infer<typeof TaskSchema>;