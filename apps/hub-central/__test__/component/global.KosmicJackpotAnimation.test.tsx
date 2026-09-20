import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KosmicJackpotAnimation } from '../../components/global/KosmicJackpotAnimation';

describe('UI: KosmicJackpotAnimation (Pluie Dorée du Gacha)', () => {

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('🟢 doit rester invisible si isJackpot est false', () => {
    render(<KosmicJackpotAnimation isJackpot={false} />);
    const region = screen.queryByRole('region', { name: /animation de la faveur du kosmos/i });
    expect(region).toBeNull();
  });

  it('🟢 doit s\'afficher et déclencher la pluie dorée si isJackpot est true', () => {
    render(<KosmicJackpotAnimation isJackpot={true} />);
    
    const region = screen.getByRole('region', { name: /animation de la faveur du kosmos/i });
    expect(region).toBeDefined();
    expect(screen.getByText(/FAVEUR DU KOSMOS !/i)).toBeDefined();
  });

  it('🟢 doit disparaître automatiquement et appeler onComplete après la durée impartie', () => {
    const handleComplete = vi.fn();
    render(<KosmicJackpotAnimation isJackpot={true} durationMs={3000} onComplete={handleComplete} />);

    // L'animation est visible
    expect(screen.getByRole('region')).toBeDefined();

    // Avancement du temps fictif de 3 secondes
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // L'animation doit avoir disparu
    expect(screen.queryByRole('region')).toBeNull();
    expect(handleComplete).toHaveBeenCalledTimes(1);
  });
});