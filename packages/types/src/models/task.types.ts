import { z } from 'zod';

/**
 * 🔄 CYCLE DE VIE UNIFIÉ (SSOT)
 * Aligne le Kanban, la Résonance (COMPLETED -> DONE), l'Irrigation et l'Économie
 */
export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',         // Remplace "COMPLETED" pour unifier Kanban & Résonance
  BLOCKED = 'BLOCKED',
  ROMPU = 'ROMPU',       // État stérile en cas de rupture de sève (It = 0)
  LOCKED = 'LOCKED',     // Verrouillé par le système (ex: Paris KonTraKt / Canopée)
  ARCHIVED = 'ARCHIVED'
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
  assigneeUids: z.array(z.string()).default([]), // Défaut array vide
  
  // 🏷️ L'ARCHIVE (Silice Concrète)
  content: z.object({
    title: z.string().min(1, "L'atome doit avoir un nom"),
    description: z.string().optional(),
    tags: z.array(z.string()).default([]),
    attachments: z.array(z.string()).default([])
  }),

  fileUploads: z.array(z.string()).default([]),

  // 🕸️ LE PONT TRANSVERSAL (Il est vital qu'il soit ici !)
  connections: z.object({
    targetModule: z.string().nullable().optional(),
    targetEntityUid: z.string().nullable().optional()
  }).optional(),

  status: TaskStatusSchema.default(TaskStatus.TODO),
  priority: TaskPrioritySchema.default(TaskPriority.MEDIUM),

  // 🌱 LA SÈVE : Les racines et la Loi de l'Irrigation (It)
  dependencies: z.array(
    z.object({
      id: z.string(),
      status: z.number().int().min(0).max(1),
    })
  ).default([]),
  isIrrigated: z.number().optional().default(1),

  // ⏱️ LE TEMPS (SSOT Pomodoro strict)
  pomodoros: z.object({
    estimated: z.number().min(1).default(1),
    completed: z.number().min(0).default(0),
  }).default({ estimated: 1, completed: 0 }),

  metrics: z.object({
    complexity: z.number().min(1).max(10).default(1),
  }).default({ complexity: 1 }),

  documents: z.array(z.object({
    uid: z.string(),
    name: z.string(),
    label: z.string(),
    url: z.string(),
    mimeType: z.string(),
    createdAt: z.union([z.date(), z.string().datetime()]).optional(),
  })).default([]),

  dates: z.object({
    createdAt: z.union([z.date(), z.string().datetime()]).optional(),
    updatedAt: z.union([z.date(), z.string().datetime()]).optional(),
    deadline: z.union([z.date(), z.string().datetime()]).optional(),
    scheduledAt: z.union([z.date(), z.string().datetime()]).optional().nullable(),
    completedAt: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  }).default({}),
});

// 🔄 INFERENCE : Génération automatique du type TypeScript depuis le schéma Zod
export type ITask = z.infer<typeof TaskSchema>;

/**
 * 📤 PAYLOADS D'API : Vues partielles du schéma pour les requêtes réseau
 */
export const FosterTaskPayloadSchema = TaskSchema.pick({
  projectUid: true,
  parentUid: true,
  assigneeUids: true,
  content: true,
  connections: true,
  status: true,
  priority: true,
  dependencies: true,
  pomodoros: true,
  metrics: true,
  dates: true
}).partial({
  parentUid: true,
  assigneeUids: true,
  connections: true,
  status: true,
  priority: true,
  dependencies: true,
  pomodoros: true,
  metrics: true,
  dates: true
});

export type FosterTaskPayload = z.infer<typeof FosterTaskPayloadSchema>;

export const UpdateTaskPayloadSchema = TaskSchema.partial().omit({ 
  uid: true, 
  projectUid: true, 
  creatorUid: true 
});

export type UpdateTaskPayload = z.infer<typeof UpdateTaskPayloadSchema>;