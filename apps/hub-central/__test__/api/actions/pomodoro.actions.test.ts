import { describe, it, expect, vi, beforeEach } from 'vitest';
import { completePomodoroAction } from '../../../app/actions/kanban.actions'; // 🚩 Vérifie bien le nombre de ../
import { TransactionManager } from '@ilot/shared-core/src/sync-engine/transactionManager';

// 🛡️ Mock du TransactionManager
vi.mock('@ilot/shared-core/src/sync-engine/transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(),
  }
}));

// 🛡️ Mock du cache Next.js
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Action Pomodoro - completePomodoroAction', () => {
  const mockTaskUid = 'task_pomo_123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('✅ doit valider le pomodoro et incrémenter le compteur', async () => {
    // Simulation d'un retour réussi du Nexus
    vi.mocked(TransactionManager.execute).mockResolvedValueOnce({
      pomodoros: { completed: 5 }
    });

    const result = await completePomodoroAction(mockTaskUid);

    expect(result.success).toBe(true);
    expect(result.newCount).toBe(5);
  });

  it('🚨 doit propager une brèche si la transaction échoue', async () => {
    vi.mocked(TransactionManager.execute).mockRejectedValueOnce(new Error("Timeout du Nexus"));

    const result = await completePomodoroAction(mockTaskUid);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe("Timeout du Nexus");
  });
});