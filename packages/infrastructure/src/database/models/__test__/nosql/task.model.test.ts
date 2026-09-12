// packages/infrastructure/src/models/__tests__/task.model.test.ts
import { describe, it, expect, vi } from 'vitest';
import { TaskModel } from '../../nosql/task.model';
import { TaskStatus, TaskPriority } from '@ilot/types';

// On mocke les dépendances externes pour isoler le test du schéma
vi.mock('../../../../../shared-core/src/utils/seve.engine', () => ({
  SeveEngine: {
    calculateResonance: vi.fn().mockReturnValue(5)
  }
}));
vi.mock('../../../../../shared-core/src/sync-engine/task.irrigation.orchestrator', () => ({
  TaskIrrigationOrchestrator: {
    evaluateAndSanitize: vi.fn((data) => data)
  }
}));

describe('TaskModel - Schéma Silice et Maillage Transversal', () => {
  
  it('⚙️ doit valider un Atome complet incluant la sève et le maillage transversal (connections)', () => {
    const validTaskData = {
      uid: 'task_123',
      projectUid: 'proj_456',
      creatorUid: 'bird_789',
      content: {
        title: 'Mixage de la basse',
        description: 'Ajuster les fréquences graves.'
      },
      // Le nouveau maillage KaÔdZ
      connections: {
        targetModule: 'PARTITA',
        targetEntityUid: 'partita_999'
      },
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      dependencies: [{ id: 'task_001', status: 1 }],
      isIrrigated: 1,
      pomodoros: { estimated: 3, completed: 1 },
      metrics: { complexity: 7 },
      dates: {
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };

    const task = new TaskModel(validTaskData);
    const validationError = task.validateSync();
    
    expect(validationError).toBeUndefined();
    expect(task.connections?.targetModule).toBe('PARTITA');
    expect(task.connections?.targetEntityUid).toBe('partita_999');
    expect(task.isIrrigated).toBe(1);
  });

  it('🚨 doit rejeter un Atome si ses fondations manquent (uid, projectUid, creatorUid)', () => {
    const invalidTaskData = {
      content: { title: 'Tâche Fantôme' }
    };

    const task = new TaskModel(invalidTaskData);
    const validationError = task.validateSync();
    
    expect(validationError).toBeDefined();
    expect(validationError?.errors.uid).toBeDefined();
    expect(validationError?.errors.projectUid).toBeDefined();
    expect(validationError?.errors.creatorUid).toBeDefined();
  });

  it('🌱 doit accepter une tâche sans connections (maillage optionnel) et appliquer les valeurs par défaut', () => {
    const minimalTaskData = {
      uid: 'task_minimal',
      projectUid: 'proj_000',
      creatorUid: 'bird_000',
      content: { title: 'Tâche isolée' }
    };

    const task = new TaskModel(minimalTaskData);
    const validationError = task.validateSync();
    
    expect(validationError).toBeUndefined();
    
    // Vérification des valeurs par défaut du schéma de la Silice
    expect(task.connections?.targetModule).toBeNull();
    expect(task.connections?.targetEntityUid).toBeNull();
    expect(task.status).toBe(TaskStatus.TODO);
    expect(task.priority).toBe(TaskPriority.MEDIUM);
    expect(task.pomodoros?.estimated).toBe(1);
  });
});