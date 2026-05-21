// apps/hub-central/__test__/api/tasks.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { completePomodoroAction } from '../../app/actions/kanban.actions';
import { getServerSession } from "next-auth/next";

// 🛡️ 1. Mock de la Douane d'Authentification
vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn(),
}));

// 🛡️ 2. Mock du module @ilot/shared-core pour isoler totalement l'Orchestrateur
vi.mock('@ilot/shared-core', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    TaskOrchestrator: vi.fn().mockImplementation(() => ({
      completePomodoro: vi.fn().mockResolvedValue({ pomodoros: { completed: 1 } })
    }))
  };
});

// 🛡️ 3. Désactivation des appels d'infrastructure résiduels
vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
  getNeo4jSession: vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue({ records: [] }), close: vi.fn() })
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

    // 🪡 CORRECTION : L'action ne crash plus, elle renvoie un objet. 
    // On vérifie donc la structure de cet objet retourné.
    const result = await completePomodoroAction('task_pomo_123');

    expect(result.success).toBe(false);
    expect(result.error).toBe("Oiseau non identifié. Le flux temporel est rompu.");
  });
});