import { describe, it, expect, vi, beforeEach } from 'vitest';
import { completePomodoroAction } from '../../../app/actions/kanban.actions';
import { getServerSession } from "next-auth/next";

// 🛡️ 1. Mock de la Douane d'Authentification
vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn(),
}));

// 🛡️ 2. Mock de l'Infrastructure (Silice & Graphe)
vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue({}),
  getNeo4jSession: vi.fn().mockReturnValue({
    run: vi.fn().mockResolvedValue({
      records: [{
        get: (key: string) => (key === 'projectCaps' ? ['*'] : true)
      }]
    }),
    close: vi.fn()
  }),
  // On mocke TaskModel pour simuler la mise à jour de la Silice
  TaskModel: {
    findOneAndUpdate: vi.fn().mockResolvedValue({
      pomodoros: { completed: 1 },
      dates: { updatedAt: new Date() }
    })
  }
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

describe('Action Pomodoro - completePomodoroAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('✅ doit valider le pomodoro si l\'Artisan est reconnu par la Douane', async () => {
    // On simule une Signature valide
    vi.mocked(getServerSession).mockResolvedValue({ 
      user: { uid: 'bird-999' } 
    } as any);

    const result = await completePomodoroAction('task_pomo_123');

    expect(result.success).toBe(true);
    expect(result.newCount).toBe(1);
  });
});