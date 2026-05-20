// apps/hub-central/__test__/api/actions/pomodoro.actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { completePomodoroAction } from '../../app/actions/kanban.actions';
import { getServerSession } from "next-auth/next";
import { TaskModel, getNeo4jSession } from '../../../../packages/infrastructure';

// 🛡️ 1. Mock de la Douane d'Authentification
vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn(),
}));

// 🛡️ 2. Mock complet et unifié de l'infrastructure
vi.mock('../../../../packages/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue({}),
  TaskModel: {
    findOneAndUpdate: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({ uid: 'task_pomo_123', pomodoros: { completed: 1 } })
    })
  },
  getNeo4jSession: vi.fn().mockReturnValue({
    run: vi.fn().mockResolvedValue({
      records: [{
        get: (key: string) => (key === 'projectCaps' ? ['*'] : true)
      }]
    }),
    close: vi.fn().mockResolvedValue(undefined)
  })
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

describe('Action Pomodoro - completePomodoroAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('✅ doit valider le pomodoro si l\'Artisan est reconnu par la Douane', async () => {
    // 🛡️ Mock de la Session NextAuth
    vi.mocked(getServerSession).mockResolvedValue({ 
      user: { uid: 'bird-999' } 
    } as any);

    // Exécution de l'action
    const result = await completePomodoroAction('task_pomo_123');

    // Vérifications
    expect(result.success).toBe(true);
    expect(result.newCount).toBe(1);
    expect(TaskModel.findOneAndUpdate).toHaveBeenCalledWith(
      { uid: 'task_pomo_123' },
      expect.objectContaining({ 
        $inc: { "pomodoros.completed": 1 } 
      }),
      expect.anything()
    );
  });

  it('❌ doit échouer si l\'Artisan n\'est pas dans le sanctuaire (Pas de session)', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const result = await completePomodoroAction('task_pomo_123');

    expect(result.success).toBe(false);
    // Vérification ajustée selon l'erreur levée par ton action
    expect(result.error).toBe("Non autorisé.");
  });
});