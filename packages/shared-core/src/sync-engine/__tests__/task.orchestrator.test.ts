import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskOrchestrator } from '../task.orchestrator';
import { TaskModel, ProjectModel } from '../../../../infrastructure';
import { TransactionManager } from '../transactionManager';

// ✨ SUTURE DE HOISTING : Préparation de l'espion de Graphe
const { mockNeo4jRun } = vi.hoisted(() => ({
  mockNeo4jRun: vi.fn().mockResolvedValue({ records: [] })
}));

// 🛡️ Mock de l'infrastructure
vi.mock('@ilot/infrastructure', () => ({
  TaskModel: { create: vi.fn(), findOneAndUpdate: vi.fn(), findOneAndDelete: vi.fn() },
  ProjectModel: { findOne: vi.fn() },
  // Le TransactionManager sera espionné plus précisément dans le beforeEach
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
    // On force l'exécution immédiate du callback pour éviter le timeout de 10s [cite: 2026-04-02]
    vi.spyOn(TransactionManager, 'execute').mockImplementation(async (name, callback) => {
      return callback(null as any, { run: mockNeo4jRun } as any);
    });
  });

  it('doit fonder une tâche avec pomodoros et escouade multi-oiseaux', async () => {
    const mockTask = { 
      uid: 'task_123', 
      content: { title: 'Suture du Graphe' },
      assigneeUids: ['user_1', 'user_2'],
      pomodoros: { estimated: 3, completed: 0 },
      metrics: { mentalLoad: 50 }
    };

    // Simulation des réponses de la Silice (Mongo) [cite: 2026-03-09]
    (ProjectModel.findOne as any).mockResolvedValue({ _id: 'proj_abc', uid: 'project_789' });
    (TaskModel.create as any).mockResolvedValue([mockTask]);

    const result = await TaskOrchestrator.fosterTask({
      projectUid: 'project_789',
      creatorUid: 'user_999',
      assigneeUids: ['user_1', 'user_2'],
      content: { title: 'Suture du Graphe' },
      pomodoros: { estimated: 3, completed: 0 },
      metrics: { mentalLoad: 50 }
    } as any);

    // ✅ ASSERTIONS : Unicité et Tissage [cite: 2026-04-02]
    expect(result.uid).toBe('task_123');
    expect(mockNeo4jRun).toHaveBeenCalledWith(
      expect.stringContaining('UNWIND $assigneeUids AS aUid'),
      expect.objectContaining({ taskUid: 'task_123', projectUid: 'project_789' })
    );
    
    expect(TaskModel.create).toHaveBeenCalled();
  });
});