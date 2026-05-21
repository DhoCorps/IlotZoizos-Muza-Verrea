// apps/hub-central/__test__/component/pomodoro.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { PomodoroProvider, usePomodoro } from '../../context/PomodoroContext';
import * as actions from '../../app/actions/kanban.actions';

Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
  configurable: true,
  get() {
    return () => Promise.resolve(); // Mock inoffensif
  }
});

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    connectToDatabase: vi.fn().mockResolvedValue(true),
    getNeo4jSession: vi.fn().mockReturnValue({ 
      run: vi.fn().mockResolvedValue({ records: [] }),
      close: vi.fn().mockResolvedValue(true)
    })
  };
});

// 🛡️ Mock de l'action serveur
vi.mock('../../app/actions/kanban.actions', () => ({
  completePomodoroAction: vi.fn().mockResolvedValue({ success: true })
}));

describe("PomodoroContext - Suture Temporelle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it("✅ doit appeler l'action de sédimentation quand le temps est écoulé", async () => {
    const { result } = renderHook(() => usePomodoro(), { wrapper: PomodoroProvider });

    // 1. Démarrer le focus sur une tâche
    act(() => {
      result.current.startFocus('task-123');
    });
    expect(result.current.status).toBe('WORK');

    // 2. Avancer le temps virtuellement (25 minutes en secondes)
    act(() => {
      vi.advanceTimersByTime(25 * 60 * 1000);
    });
    
    // 🪡 SUTURE : On laisse le cycle d'événement React se terminer avant d'asserter
    await act(async () => {
      await Promise.resolve();
    });

    // 3. Vérifier que l'action serveur a été déclenchée pour l'Atome
    expect(actions.completePomodoroAction).toHaveBeenCalledWith('task-123');
    
    // 4. Vérifier la transition vers la Stase (Pause)
    expect(result.current.status).toBe('BREAK');
  });

  it("✅ doit permettre d'arrêter le focus manuellement", () => {
    const { result } = renderHook(() => usePomodoro(), { wrapper: PomodoroProvider });

    act(() => {
      result.current.startFocus('task-123');
      result.current.stopFocus();
    });

    expect(result.current.status).toBe('IDLE');
    expect(result.current.activeTaskUid).toBeNull();
  });
});