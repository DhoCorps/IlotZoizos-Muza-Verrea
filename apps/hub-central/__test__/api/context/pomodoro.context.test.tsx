/**
 * @vitest-environment jsdom
 */
import React from 'react'; // 🧪 La suture vitale pour le JSX
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { PomodoroProvider, usePomodoro } from '../../../context/PomodoroContext';
import { completePomodoroAction } from '../../../app/actions/kanban.actions';

// 🛡️ Mock des impulsions nerveuses vers la Silice
vi.mock('../../../app/actions/kanban.actions', () => ({
  completePomodoroAction: vi.fn(),
}));

// 🛡️ Simulation de l'environnement sonore pour JSDOM
if (typeof window !== 'undefined') {
  global.Audio = vi.fn().mockImplementation(() => ({
    play: vi.fn().mockResolvedValue(true),
  })) as any;
}

describe('Cœur Temporel - PomodoroContext', () => {
  beforeEach(() => {
    // ⏳ Prise de contrôle du temps
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // ⏳ Restitution du temps réel
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  // Le réceptacle pour injecter le Provider autour du Hook en test
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <PomodoroProvider>
      {children}
    </PomodoroProvider>
  );

  it('⏱️ doit démarrer un cycle de focus correctement', () => {
    const { result } = renderHook(() => usePomodoro(), { wrapper });

    expect(result.current.status).toBe('IDLE');

    act(() => {
      result.current.startFocus('task_123');
    });

    expect(result.current.status).toBe('WORK');
    expect(result.current.activeTaskUid).toBe('task_123');
    expect(result.current.secondsLeft).toBe(25 * 60);
  });

  it('🍅 doit valider un pomodoro et passer en pause courte', async () => {
    const { result } = renderHook(() => usePomodoro(), { wrapper });

    act(() => {
      result.current.startFocus('task_123');
    });

    // ⏩ Saut temporel de 25 minutes
    await act(async () => {
      vi.advanceTimersByTime(25 * 60 * 1000);
    });

    // Vérification de la décharge vers la base de données
    expect(completePomodoroAction).toHaveBeenCalledWith('task_123');
    
    // Vérification de la transition vers la pause
    expect(result.current.status).toBe('BREAK');
    expect(result.current.secondsLeft).toBe(5 * 60);
    expect(result.current.consecutiveCount).toBe(1);
  });

  it('🔋 doit déclencher une pause longue après 4 combos', async () => {
    const { result } = renderHook(() => usePomodoro(), { wrapper });

    // On simule 4 cycles complets de 30mn (25+5)
    for (let i = 1; i <= 4; i++) {
      act(() => { 
        result.current.startFocus('task_123'); 
      });
      
      // Fin du travail
      await act(async () => { 
        vi.advanceTimersByTime(25 * 60 * 1000); 
      });
      
      // Si on n'est pas au dernier cycle, on simule la fin de la pause courte
      if (i < 4) {
         await act(async () => { 
           vi.advanceTimersByTime(5 * 60 * 1000); 
         });
      }
    }

    // 🔥 La règle d'or : 4ème combo = Pause longue
    expect(result.current.consecutiveCount).toBe(4);
    expect(result.current.status).toBe('LONG_BREAK');
    expect(result.current.secondsLeft).toBe(30 * 60); // 30 minutes de récupération
  });
});