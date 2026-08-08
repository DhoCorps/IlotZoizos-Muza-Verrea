// apps/hub-central/__test__/api/actions/pomodoro.actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { completePomodoroAction } from '@/app/actions/kanban.actions';
import { getServerSession } from "next-auth/next";

// 🛡️ SUTURE MAJEURE : On mock l'Orchestrateur directement. 
// L'Action n'a pas besoin de tester la base de données, elle délègue cette tâche.
vi.mock('@ilot/shared-core', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    TaskOrchestrator: vi.fn().mockImplementation(() => ({
      completePomodoro: vi.fn().mockResolvedValue({ pomodoros: { completed: 1 } })
    }))
  };
});

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
      user: { uid: 'bird-999', capabilities: [] } 
    } as any);

    const result = await completePomodoroAction('task_pomo_123');

    expect(result.success).toBe(true);
    expect(result.newCount).toBe(1);
  });

  it('❌ doit échouer si l\'Artisan n\'est pas dans le sanctuaire (Pas de session)', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const result = await completePomodoroAction('task_pomo_123');

    expect(result.success).toBe(false);
    expect(result.error).toBe("Oiseau non identifié. Le flux temporel est rompu.");
  });
});