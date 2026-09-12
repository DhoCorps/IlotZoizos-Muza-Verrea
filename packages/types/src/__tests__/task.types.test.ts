import { describe, it, expect } from 'vitest';
import { TaskSchema, TaskStatus, TaskPriority } from '../models/task.types';

// 🕵️‍♂️ L'INVESTIGATION : Voyons ce que Zod a réellement dans le ventre en direct !
console.log("🔍 STRUCTURE RÉELLE CHARGÉE PAR ZOD :", Object.keys(TaskSchema.shape));

describe('TaskSchema (Zod) - Validation Typographique', () => {
  
  it('🛡️ doit valider un payload complet et strict avec maillage transversal', () => {
    const fullPayload = {
      uid: 'task_zod_1',
      projectUid: 'proj_zod_1',
      parentUid: null,
      creatorUid: 'bird_alpha',
      assigneeUids: ['bird_alpha', 'bird_beta'],
      content: {
        title: 'Intégration du synthétiseur',
        description: 'Ajouter les filtres',
        tags: ['audio'],
        attachments: []
      },
      fileUploads: [],
      // Le maillage
      connections: {
        targetModule: 'SAMPLOTEK',
        targetEntityUid: 'sample_007'
      },
      status: TaskStatus.DONE,
      priority: TaskPriority.CRITICAL,
      dependencies: [{ id: 'task_zod_0', status: 1 }],
      isIrrigated: 1,
      pomodoros: {
        estimated: 4,
        completed: 4
      },
      metrics: {
        complexity: 8
      },
      documents: [],
      dates: {
        createdAt: new Date(),
        updatedAt: new Date(),
        scheduledAt: new Date()
      }
    };

    const result = TaskSchema.safeParse(fullPayload);
    expect(result.success).toBe(true);
    
    if (result.success) {
      // Si connections est toujours undefined ici, c'est que Vitest lit un vieux fichier compilé !
      expect(result.data.connections?.targetModule).toBe('SAMPLOTEK');
    }
  });

  it('⚡ doit tolérer l\'absence des champs optionnels', () => {
    const minimalPayload = {
      uid: 'task_zod_2',
      projectUid: 'proj_zod_2',
      creatorUid: 'bird_gamma',
      assigneeUids: [],
      content: { title: 'Tâche minimaliste', tags: [], attachments: [] },
      fileUploads: [],
      status: TaskStatus.TODO,
      priority: TaskPriority.LOW,
      pomodoros: { estimated: 1, completed: 0 },
      metrics: { complexity: 1 },
      documents: [],
      dates: { createdAt: new Date(), updatedAt: new Date() }
    };

    const result = TaskSchema.safeParse(minimalPayload);
    expect(result.success).toBe(true);
  });

  it('💥 doit rejeter un payload avec des valeurs hors limites', () => {
    const invalidPayload = {
      uid: 'task_zod_3',
      projectUid: 'proj_zod_3',
      creatorUid: 'bird_delta',
      assigneeUids: [],
      content: { title: 'Surcharge', tags: [], attachments: [] },
      fileUploads: [],
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.MEDIUM,
      pomodoros: { estimated: 1, completed: 0 },
      metrics: { complexity: 15 }, // <-- Invalide (max 10)
      documents: [],
      dates: { createdAt: new Date(), updatedAt: new Date() }
    };

    const result = TaskSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });
});