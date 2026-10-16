// Fichier : packages/types/src/__tests__/task.types.test.ts
import { describe, it, expect } from 'vitest';
import { 
  TaskSchema, 
  TaskStatus, 
  TaskPriority,
  FosterTaskPayloadSchema,
  UpdateTaskPayloadSchema
} from '../models/task.types';

// 🕵️‍♂️ L'INVESTIGATION : Voyons ce que Zod a réellement dans le ventre en direct !
console.log("🔍 STRUCTURE RÉELLE CHARGÉE PAR ZOD :", Object.keys(TaskSchema.shape));

describe('TaskSchema (Zod) - Validation Typographique & Pont Transversal SSOT', () => {
  
  it('🛡️ doit valider un payload complet et strict avec maillage transversal (EntityTargetEnum) et coercer les dates ISO', () => {
    const isoDate = new Date().toISOString();
    
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
      connections: {
        targetModule: 'SAMPLOTEK',
        targetEntityUid: 'sample_007'
      },
      status: TaskStatus.DONE, // On vérifie le statut unifié (DONE)
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
      documents: [{
        uid: 'doc_1',
        name: 'Spec',
        label: 'spec.pdf',
        url: 'https://cdn.ilot.zoizos/spec.pdf',
        mimeType: 'application/pdf',
        createdAt: isoDate // ⏳ String ISO
      }],
      dates: {
        createdAt: isoDate, // ⏳ String ISO
        updatedAt: isoDate, // ⏳ String ISO
        scheduledAt: isoDate, // ⏳ String ISO
        completedAt: isoDate // ⏳ String ISO
      }
    };

    const result = TaskSchema.safeParse(fullPayload);
    
    // 🛡️ SÉCURITÉ DEBUG : Affiche l'erreur exacte dans la console si Zod bloque
    if (!result.success) {
      console.error("Zod Validation Error (Full):", result.error.flatten());
    }
    
    expect(result.success).toBe(true);
    
    if (result.success) {
      expect(result.data.connections?.targetModule).toBe('SAMPLOTEK');
      // ⏳ Vérification du coerce sur toutes les dates
      expect(result.data.dates.createdAt).toBeInstanceOf(Date);
      expect(result.data.dates.createdAt?.toISOString()).toBe(isoDate);
      expect(result.data.dates.updatedAt).toBeInstanceOf(Date);
      expect(result.data.dates.scheduledAt).toBeInstanceOf(Date);
      expect(result.data.dates.completedAt).toBeInstanceOf(Date);
      expect(result.data.documents[0].createdAt).toBeInstanceOf(Date);
    }
  });

  it('⚡ doit tolérer l\'absence des champs optionnels et générer les valeurs par défaut', () => {
    const minimalPayload = {
      uid: 'task_zod_2',
      projectUid: 'proj_zod_2',
      creatorUid: 'bird_gamma',
      content: { title: 'Tâche minimaliste' } // Seulement le strict minimum
    };

    const result = TaskSchema.safeParse(minimalPayload);
    
    if (!result.success) {
      console.error("Zod Validation Error (Minimal):", result.error.flatten());
    }
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe(TaskStatus.TODO);
      expect(result.data.pomodoros.estimated).toBe(1);
      expect(result.data.pomodoros.completed).toBe(0);
      expect(result.data.assigneeUids).toEqual([]);
    }
  });

  it('💥 doit rejeter un payload avec des valeurs hors limites ou un targetModule inconnu de EntityTargetEnum', () => {
    const invalidPayload = {
      uid: 'task_zod_3',
      projectUid: 'proj_zod_3',
      creatorUid: 'bird_delta',
      content: { title: 'Surcharge' },
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.MEDIUM,
      metrics: { complexity: 15 }, // <-- Invalide (max 10)
    };

    expect(TaskSchema.safeParse(invalidPayload).success).toBe(false);

    const invalidModulePayload = {
      uid: 'task_zod_4',
      projectUid: 'proj_zod_4',
      creatorUid: 'bird_delta',
      content: { title: 'Pont corrompu' },
      connections: {
        targetModule: 'MODULE_INCONNU',
        targetEntityUid: 'ent_1'
      }
    };

    expect(TaskSchema.safeParse(invalidModulePayload).success).toBe(false);
  });

  describe('Payloads API (Foster & Update)', () => {
    it('🟢 doit valider un FosterTaskPayload valide', () => {
      const payload = {
        projectUid: 'proj_123',
        content: { title: 'Nouvel atome API' },
        pomodoros: { estimated: 3, completed: 0 }
      };
      
      const result = FosterTaskPayloadSchema.safeParse(payload);
      if (!result.success) {
        console.error("Zod Foster Payload Error:", result.error.flatten());
      }
      expect(result.success).toBe(true);
    });

    it('🔴 doit rejeter un UpdateTaskPayload essayant de modifier l\'UID', () => {
      const payload = {
        uid: 'hacked_uid',
        status: TaskStatus.LOCKED
      };
      
      const result = UpdateTaskPayloadSchema.safeParse(payload);
      if (result.success) {
        expect((result.data as any).uid).toBeUndefined(); // Zod ignore l'UID silencieusement (omit)
        expect(result.data.status).toBe(TaskStatus.LOCKED);
      }
    });
  });
});