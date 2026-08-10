import { describe, it, expect, vi, beforeEach } from 'vitest';
import { completePomodoroAction } from '@/app/actions/kanban.actions';
import { getServerSession } from "next-auth/next";
import { TaskOrchestrator } from '@ilot/shared-core';

// -------------------------------------------------------------------------
// 🎭 MOCKS
// -------------------------------------------------------------------------
vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

// On laisse Infrastructure et Shared-Core exister, on espionnera uniquement ce qu'il faut
vi.mock('@ilot/infrastructure', () => ({
  TaskModel: { find: vi.fn() },
  getNeo4jSession: vi.fn()
}));

describe('Action Pomodoro - completePomodoroAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 🛡️ SUTURE CHIRURGICALE : Espionnage direct sur le prototype de l'orchestrateur
    vi.spyOn(TaskOrchestrator.prototype, 'completePomodoro').mockResolvedValue({
      pomodoros: { completed: 1 }
    } as any);
  });

  it('✅ doit valider le pomodoro si l\'Artisan est reconnu par la Douane', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ 
      user: { uid: 'bird-999', capabilities: [] } 
    } as any);

    const result = await completePomodoroAction('task_pomo_123');

    expect(result.success).toBe(true);
    expect(result.newCount).toBe(1);
    expect(TaskOrchestrator.prototype.completePomodoro).toHaveBeenCalledWith(
        'task_pomo_123',
        expect.objectContaining({ actorUid: 'bird-999' })
    );
  });

  it('❌ doit échouer si l\'Artisan n\'est pas dans le sanctuaire (Pas de session)', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const result = await completePomodoroAction('task_pomo_123');

    expect(result.success).toBe(false);
    expect(result.error).toBe("Oiseau non identifié. Le flux temporel est rompu.");
  });

  it('❌ doit échouer si l\'orchestrateur renvoie une fracture (erreur)', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ 
      user: { uid: 'bird-999', capabilities: [] } 
    } as any);
    
    // On force une erreur pour tester le catch
    vi.spyOn(TaskOrchestrator.prototype, 'completePomodoro').mockRejectedValue(new Error("Erreur base"));

    const result = await completePomodoroAction('task_pomo_123');

    expect(result.success).toBe(false);
    expect(result.error).toBe("Impossible de sceller l'effort dans la Silice.");
  });
});