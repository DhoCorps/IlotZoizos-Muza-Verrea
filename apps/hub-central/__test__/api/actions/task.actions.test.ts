import { describe, it, expect, vi, beforeEach } from 'vitest';
import { completePomodoroAction, deleteTaskAction, updateTaskStatusAction } from '@/app/actions/task.actions';
import { TaskOrchestrator } from '@ilot/shared-core';
import { getServerSession } from "next-auth/next";
import { getNeo4jSession } from '@ilot/infrastructure';
import { revalidatePath } from 'next/cache';

// 🎭 Mocks
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  getNeo4jSession: vi.fn(() => ({
    run: vi.fn().mockResolvedValue({
      records: [{ get: (key: string) => (key === 'isDirectlyInvolved' ? true : ['*']) }]
    }),
    close: vi.fn(),
  })),
  TaskModel: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) })
    })
  }
}));

vi.mock('@ilot/shared-core', () => ({
  TaskOrchestrator: class {
    completePomodoro = vi.fn().mockResolvedValue({ pomodoros: { completed: 3 } });
    updateTask = vi.fn().mockResolvedValue({ success: true });
    disintegrateTask = vi.fn().mockResolvedValue({ success: true });
    fosterTask = vi.fn().mockResolvedValue({ uid: 'task_new' });
  },
  CAPABILITIES: {
    TASK: { CREATE: 'task:create', READ: 'task:read', UPDATE: 'task:update', DELETE: 'task:delete' },
    PROJECT: { READ: 'project:read' }
  }
}));

describe('Tasks Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('completePomodoroAction', () => {
    it('🟢 doit valider un cycle Pomodoro via le TaskOrchestrator avec succès', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'user_123', capabilities: ['*'] }
      } as any);

      const res = await completePomodoroAction('task_abc');

      expect(res.success).toBe(true);
      expect(res.newCount).toBe(3);
      expect(revalidatePath).toHaveBeenCalledWith('/tom-hat-toes');
    });

    it('🔴 doit rejeter si l\'utilisateur n\'est pas authentifié', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const res = await completePomodoroAction('task_abc');

      expect(res.success).toBe(false);
      expect(res.error).toBe('Non autorisé.');
    });
  });

  describe('updateTaskStatusAction', () => {
    it('🟢 doit mettre à jour le statut d\'un atome avec succès', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'user_123', capabilities: ['*'] }
      } as any);

      const res = await updateTaskStatusAction('task_abc', 'DONE');

      expect(res.success).toBe(true);
      expect(revalidatePath).toHaveBeenCalledWith('/tom-hat-toes');
    });
  });

  describe('deleteTaskAction', () => {
    it('🟢 doit dissoudre un atome via l\'orchestrateur', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'user_123', capabilities: ['*'] }
      } as any);

      const res = await deleteTaskAction('task_abc');

      expect(res.success).toBe(true);
      expect(revalidatePath).toHaveBeenCalledWith('/tom-hat-toes');
    });
  });
});