// packages/shared-core/src/sync-engine/__tests__/task.orchestrator.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskOrchestrator } from '../task.orchestrator';
import { TaskModel, ProjectModel } from '../../../../infrastructure';
import { TransactionManager } from '../transactionManager';

// ✨ SUTURE DE HOISTING : Préparation de l'espion de Graphe
const { mockNeo4jRun } = vi.hoisted(() => ({
  mockNeo4jRun: vi.fn().mockResolvedValue({ records: [] })
}));

// 🛡️ Mock de l'infrastructure
vi.mock('../../../../infrastructure', () => ({
  TaskModel: { 
    create: vi.fn(), 
    findOneAndUpdate: vi.fn(), 
    findOneAndDelete: vi.fn(),
    findOne: vi.fn() 
  },
  ProjectModel: { findOne: vi.fn() },
  TransactionManager: { execute: vi.fn() },
  getNeo4jSession: vi.fn().mockReturnValue({
    run: mockNeo4jRun,
    close: vi.fn().mockResolvedValue(null),
  }),
}));

describe('TaskOrchestrator - Atome de Travail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // 🕊️ NEUTRALISATION DU TRANSACTION MANAGER
    // On simule une exécution réussie de la transaction pour passer les tests unitaires
    vi.spyOn(TransactionManager, 'execute').mockImplementation(async (name, callback) => {
      // On passe une session fictive et l'espion Neo4j
      return callback(null as any, { run: mockNeo4jRun } as any);
    });
  });

  it('doit fonder une tâche avec pomodoros et escouade multi-oiseaux', async () => {
    // 🐣 Définition de l'atome
    const mockTask = { 
      uid: 'task_123', 
      content: { 
        title: 'Suture du Graphe',
        description: 'Vérification de la double-suture',
        tags: [] 
      },
      assigneeUids: ['user_1', 'user_2'],
      pomodoros: { estimated: 3, completed: 0 },
      status: 'TODO'
    };

    // Simulation des réponses de la Silice (Mongo)
    (ProjectModel.findOne as any).mockResolvedValue({ _id: 'proj_abc', uid: 'project_789' });
    
    // ✅ LA CORRECTION CRUCIALE : On renvoie un TABLEAU [mockTask]
    // car l'orchestrateur fait : const [newTask] = await TaskModel.create(...)
    (TaskModel.create as any).mockResolvedValue([mockTask]); 

    const result = await TaskOrchestrator.fosterTask({
      projectUid: 'project_789',
      creatorUid: 'user_999',
      assigneeUids: ['user_1', 'user_2'],
      content: { 
        title: 'Suture du Graphe',
        description: 'Vérification de la double-suture',
        tags: [] 
      },
      pomodoros: { estimated: 3, completed: 0 }
    } as any);

    // ✅ ASSERTIONS
    expect(result.uid).toBe('task_123');
    
    // Vérification du tissage Neo4j
    expect(mockNeo4jRun).toHaveBeenCalledWith(
      expect.stringContaining('OPTIONAL MATCH (bird:User)'),
      expect.objectContaining({ 
        taskUid: 'task_123', 
        projectUid: 'project_789' 
      })
    );
    
    expect(TaskModel.create).toHaveBeenCalled();
  });

  it('doit mettre à jour une tâche (updateTask) et synchroniser le Graphe', async () => {
    const taskUid = 'task_123';
    const updates = { status: 'DONE', content: { title: 'Titre Modifié', tags: [] } };

    (TaskModel.findOneAndUpdate as any).mockResolvedValue({
      uid: taskUid,
      status: 'DONE',
      content: { title: 'Titre Modifié' }
    });

    const result = await TaskOrchestrator.updateTask(taskUid, updates as any);

    expect(result.status).toBe('DONE');
    expect(mockNeo4jRun).toHaveBeenCalledWith(
      expect.stringContaining('SET t.status = $status'),
      expect.any(Object)
    );
  });
});