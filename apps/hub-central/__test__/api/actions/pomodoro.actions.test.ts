import { describe, it, expect, vi, beforeEach } from 'vitest';
import { completePomodoroAction } from '../../../app/actions/kanban.actions';
import { TransactionManager } from '@ilot/shared-core/src/sync-engine/transactionManager';

// 🛡️ Mock du Squelette d'Acier
vi.mock('@ilot/shared-core/src/sync-engine/transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(),
  }
}));

// 🛡️ Mock de Next.js Cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Action Pomodoro - completePomodoroAction', () => {
  const mockTaskUid = 'task_pomo_123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('✅ doit valider le pomodoro et incrémenter le compteur', async () => {
    // On simule un retour de la base avec 1 pomodoro complété
    vi.mocked(TransactionManager.execute).mockResolvedValueOnce({
      pomodoros: { completed: 1, estimated: 4 }
    });

    const result = await completePomodoroAction(mockTaskUid);

    expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    expect(result.newCount).toBe(1);
  });

  it('🚨 doit propager une brèche si la transaction échoue', async () => {
    // On simule un échec de la base (ex: timeout Neo4j)
    vi.mocked(TransactionManager.execute).mockRejectedValueOnce(new Error("Timeout du Nexus"));

    const result = await completePomodoroAction(mockTaskUid);
      
    expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Timeout du Nexus");
  });
});