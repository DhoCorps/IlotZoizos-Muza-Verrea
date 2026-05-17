/**
 * @vitest-environment jsdom
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { PomodoroProvider, usePomodoro } from '../../../context/PomodoroContext';

// 🛡️ Mock de l'action Server-Side
vi.mock('../../../app/actions/kanban.actions', () => ({
  completePomodoroAction: vi.fn().mockResolvedValue({ success: true, newCount: 1 }),
}));

describe('Cœur Temporel - PomodoroContext', () => {
  beforeEach(() => {
    // ⏳ Activation des horloges virtuelles
    vi.useFakeTimers();
    vi.clearAllMocks();
    
    // 🔔 Mock de l'Audio pour JSDOM
    global.Audio = vi.fn().mockImplementation(() => ({
      play: vi.fn().mockResolvedValue(undefined),
    })) as any;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('⏱️ doit démarrer un cycle de Sédimentation (Focus)', () => {
    const { result } = renderHook(() => usePomodoro(), { 
      wrapper: ({ children }) => <PomodoroProvider>{children}</PomodoroProvider> 
    });

    expect(result.current.status).toBe('IDLE');

    act(() => {
      result.current.startFocus('task_123');
    });

    expect(result.current.status).toBe('WORK');
    expect(result.current.activeTaskUid).toBe('task_123');
  });

  it('🔄 doit passer en Micro-Stase après un cycle de Focus', async () => {
    const { result } = renderHook(() => usePomodoro(), { 
      wrapper: ({ children }) => <PomodoroProvider>{children}</PomodoroProvider> 
    });

    act(() => {
      result.current.startFocus('task_123');
    });

    // ⏳ Saut temporel : 25 minutes s'écoulent dans la Silice
    act(() => {
      vi.advanceTimersByTime(25 * 60 * 1000);
    });

    // On laisse les promesses asynchrones se résoudre
    await act(async () => {
      await Promise.resolve();
    });

    // Vérification de la transition vers la stase
    expect(result.current.status).toBe('BREAK');
    expect(result.current.consecutiveCount).toBe(1);
  });
});