import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateTaskStatusOrchestrator } from '../kanban.orchestrator';
import { TransactionManager } from '../transactionManager';

// 🛡️ Mock de la base de données
vi.mock('../../../infrastructure/src/database/models/nosql/task.model', () => ({
  TaskModel: {
    findOneAndUpdate: vi.fn(),
  }
}));

// 🛡️ Mock du TransactionManager (pour éviter de taper de vraies bases en test)
vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(),
  }
}));

describe('Orchestrateur Kanban - updateTaskStatus', () => {
  const mockTaskUid = 'task_123';
  const newStatus = 'IN_PROGRESS';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('✅ doit muter le statut avec succès', async () => {
    // On simule une exécution parfaite du TransactionManager
    vi.mocked(TransactionManager.execute).mockResolvedValueOnce({
      success: true,
      taskUid: mockTaskUid,
      newStatus
    });

    const result = await updateTaskStatusOrchestrator(mockTaskUid, newStatus);

    expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    expect(result.newStatus).toBe(newStatus);
  });

  it('🚨 doit propager une brèche (rollback simulé)', async () => {
    // On simule une erreur réseau ou Neo4j dans la transaction
    const errorMessage = '[TransactionManager] Échec de Mutation Statut Kanban : Timeout';
    vi.mocked(TransactionManager.execute).mockRejectedValueOnce(new Error(errorMessage));

    await expect(updateTaskStatusOrchestrator(mockTaskUid, newStatus))
      .rejects
      .toThrow(errorMessage);
      
    expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
  });
});