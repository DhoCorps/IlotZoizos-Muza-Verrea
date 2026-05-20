// apps/hub-central/__test__/api/actions/pomodoro.actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { completePomodoroAction } from '../../../app/actions/kanban.actions';
import { getServerSession } from "next-auth/next";

// 🛡️ 1. Mock GLOBAL de l'infrastructure (le plus haut possible)
vi.mock('../../../../packages/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue({}),
  TaskModel: {
    findOneAndUpdate: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({ uid: 'task_pomo_123', pomodoros: { completed: 1 } })
    })
  },
  getNeo4jSession: vi.fn().mockReturnValue({
    run: vi.fn().mockResolvedValue({
      records: [{ get: () => ['*'] }]
    }),
    close: vi.fn()
  })
}));

// 🛡️ 2. Mock Session
vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

describe('Action Pomodoro - completePomodoroAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('✅ doit valider le pomodoro si l\'Artisan est reconnu par la Douane', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ 
      user: { uid: 'bird-999' } 
    } as any);

    const result = await completePomodoroAction('task_pomo_123');

    expect(result.success).toBe(true);
    expect(result.newCount).toBe(1);
  });

  it('❌ doit échouer si l\'Artisan n\'est pas dans le sanctuaire (Pas de session)', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const result = await completePomodoroAction('task_pomo_123');

    // On accepte soit le succès false soit l'erreur attendue
    expect(result.success).toBe(false);
  });
});