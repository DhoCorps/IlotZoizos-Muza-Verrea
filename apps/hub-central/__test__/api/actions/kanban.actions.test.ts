import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTaskAction, completePomodoroAction, CreateTaskInput } from '../../../app/actions/kanban.actions';
import { TaskOrchestrator } from '@ilot/shared-core';
import { getServerSession } from "next-auth/next";
import { getNeo4jSession } from '@ilot/infrastructure';
import type { Session, QueryResult } from 'neo4j-driver';

// 🛡️ Mocks globaux
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

// 🛠️ SUTURE : Le mock de classe ES6 garantit que le mot-clé `new` instanciera bien nos méthodes
vi.mock('@ilot/shared-core', () => {
  return {
    TaskOrchestrator: class {
      fosterTask = vi.fn().mockResolvedValue({ uid: 'task_123', status: 'TODO' });
      updateTask = vi.fn().mockResolvedValue({ success: true });
      disintegrateTask = vi.fn().mockResolvedValue({ success: true });
      completePomodoro = vi.fn().mockResolvedValue({ 
        uid: 'task_123', 
        pomodoros: { completed: 1 } 
      });
    }
  };
});

vi.mock('@ilot/infrastructure', () => ({
  TaskModel: {
    find: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    }),
  },
  getNeo4jSession: vi.fn(),
}));

describe('Kanban Server Actions', () => {
  const mockNeo4jSession = {
    run: vi.fn(),
    close: vi.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getNeo4jSession).mockReturnValue(mockNeo4jSession as unknown as Session);
  });

  describe('createTaskAction', () => {
    it('🔴 doit échouer si l\'utilisateur n\'est pas authentifié', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);
      
      const payload: CreateTaskInput = { title: 'Test', projectUid: 'proj_1' };
      const result = await createTaskAction(payload);
      
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Le Nexus est fermé/);
    });

    it('🟢 doit formater scheduledAt, caster proprement et appeler fosterTask avec succès', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'bird_1' }
      } as unknown as ReturnType<typeof getServerSession>);

      mockNeo4jSession.run.mockResolvedValueOnce({
        records: [{ get: (key: string) => key === 'projectCaps' ? ['*'] : false }]
      } as unknown as QueryResult);

      const payload: CreateTaskInput = {
        title: 'Nouvelle tâche',
        projectUid: 'proj_1',
        scheduledAt: null, 
      };

      const result = await createTaskAction(payload);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('uid', 'task_123');
    });
  });

  describe('completePomodoroAction', () => {
    it('🟢 doit exécuter l\'action et retourner le nouveau compte de pomodoros', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'bird_1', capabilities: ['*'] }
      } as unknown as ReturnType<typeof getServerSession>);

      const result = await completePomodoroAction('task_123');
      
      expect(result.success).toBe(true);
      expect(result.newCount).toBe(1);
    });
  });
});