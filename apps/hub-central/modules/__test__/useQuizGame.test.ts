import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQuizGame } from '@/modules/games/quiz/useQuizGame';

describe('useQuizGame Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('devrait initialiser le jeu avec les valeurs par défaut', () => {
    const { result } = renderHook(() => useQuizGame({ mode: 'standard' }));

    expect(result.current.score).toBe(0);
    expect(result.current.streak).toBe(0);
    expect(result.current.multiplier).toBe(1.0);
    expect(result.current.timeLeft).toBe(15);
    expect(result.current.isGameOver).toBe(false);
    expect(result.current.earnedTrophies).toEqual([]);
  });

  it('devrait incrémenter le score et afficher un feedback positif en cas de bonne réponse', () => {
    const { result } = renderHook(() => useQuizGame({ mode: 'standard' }));

    act(() => {
      result.current.handleAnswerSubmission(true, 2000);
    });

    expect(result.current.score).toBeGreaterThan(0);
    expect(result.current.streak).toBe(1);
    expect(result.current.multiplier).toBe(1.0); // 🪶 Ajusté à 1.0 pour la première série
    expect(result.current.feedbackEffect).toEqual({
      visible: true,
      icon: '🪶',
      text: expect.any(String),
      isPositive: true,
    });
  });

  it('devrait réinitialiser la série en cas de mauvaise réponse', () => {
    const { result } = renderHook(() => useQuizGame({ mode: 'standard' }));

    act(() => {
      result.current.handleAnswerSubmission(true, 1000);
    });
    expect(result.current.streak).toBe(1);

    act(() => {
      result.current.handleAnswerSubmission(false, 3000);
    });

    expect(result.current.streak).toBe(0);
    expect(result.current.feedbackEffect?.isPositive).toBe(false);
    expect(result.current.feedbackEffect?.text).toContain('Série brisée');
  });

  it('devrait déclencher la fin de partie (Game Over) en mode race_to_score lorsque le score cible est atteint', () => {
    const onGameOverMock = vi.fn();
    const { result } = renderHook(() => 
      useQuizGame({ mode: 'race_to_score', targetScore: 500, onGameOver: onGameOverMock })
    );

    act(() => {
      result.current.handleAnswerSubmission(true, 1000);
    });

    expect(result.current.isGameOver).toBe(true);
    expect(onGameOverMock).toHaveBeenCalledTimes(1);
  });

  it('devrait décrémenter le chronomètre de question au fil du temps', () => {
    const { result } = renderHook(() => useQuizGame({ mode: 'standard', timePerQuestion: 10 }));

    expect(result.current.timeLeft).toBe(10);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.timeLeft).toBe(7);
  });
});