// apps/hub-central/components/poetrik/__tests__/PoetrikAudioAmbiance.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { PoetrikAudioAmbiance } from '@/components/poetrik/PoetrikAudioAmbiance';

describe('Composant : PoetrikAudioAmbiance', () => {
  beforeAll(() => {
    // Mock des méthodes HTMLAudioElement non supportées par JSDOM
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
  });

  it('🟢 ne doit rien rendre si aucune trackUrl n\'est fournie', () => {
    const { container } = render(<PoetrikAudioAmbiance />);
    expect(container.firstChild).toBeNull();
  });

  it('🟢 doit afficher le lecteur et réagir au clic Play/Pause', () => {
    render(<PoetrikAudioAmbiance trackUrl="https://ilot.com/sample.mp3" trackName="Beat Pluvieux" />);
    
    expect(screen.getByText('Beat Pluvieux')).toBeDefined();
    
    const playBtn = screen.getByTestId('play-toggle');
    expect(playBtn.textContent).toBe('▶');

    fireEvent.click(playBtn);
    expect(playBtn.textContent).toBe('⏸');
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
  });
});