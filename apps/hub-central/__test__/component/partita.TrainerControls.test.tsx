// apps/hub-central/src/components/partita/__tests__/TrainerControls.test.tsx
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrainerControls } from '@/components/partita/TrainerControls';
import { usePartitaStore } from '@/store/partitaStore';

// -------------------------------------------------------------------------
// 🎭 MOCK DU STORE ZUSTAND
// -------------------------------------------------------------------------
vi.mock('@/store/partitaStore', () => ({
  usePartitaStore: vi.fn(),
}));

describe('TrainerControls Component', () => {
  const mockSetPlaybackSpeed = vi.fn();
  const mockSetMasterVolume = vi.fn();
  const mockToggleLoop = vi.fn();
  const mockToggleMetronome = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(usePartitaStore).mockReturnValue({
      playbackSpeed: 1.0,
      setPlaybackSpeed: mockSetPlaybackSpeed,
      masterVolume: 0.8,
      setMasterVolume: mockSetMasterVolume,
      isLooping: false,
      toggleLoop: mockToggleLoop,
    } as any);
  });

  it('🟢 doit s\'afficher correctement avec les valeurs par défaut', () => {
    render(<TrainerControls onToggleMetronome={mockToggleMetronome} />);

    expect(screen.getByTestId('trainer-controls')).toBeInTheDocument();
    expect(screen.getByTestId('trainer-speed-display')).toHaveTextContent('100%');
    expect(screen.getByTestId('btn-toggle-loop')).toHaveTextContent('Mode Boucle');
    expect(screen.getByTestId('btn-toggle-metronome')).toBeInTheDocument();
  });

  it('🟢 doit déclencher le changement de vitesse via le slider', () => {
    render(<TrainerControls />);

    const slider = screen.getByTestId('trainer-speed-slider');
    fireEvent.change(slider, { target: { value: '0.5' } });

    expect(mockSetPlaybackSpeed).toHaveBeenCalledWith(0.5);
  });

  it('🟢 doit basculer le mode boucle au clic sur le bouton Loop', () => {
    render(<TrainerControls />);

    const loopBtn = screen.getByTestId('btn-toggle-loop');
    fireEvent.click(loopBtn);

    expect(mockToggleLoop).toHaveBeenCalledTimes(1);
  });

  it('🟢 doit déclencher le callback du métronome', () => {
    render(<TrainerControls onToggleMetronome={mockToggleMetronome} />);

    const metronomeBtn = screen.getByTestId('btn-toggle-metronome');
    fireEvent.click(metronomeBtn);

    expect(mockToggleMetronome).toHaveBeenCalledTimes(1);
  });

  it('🟢 doit modifier le volume master et gérer le mute', () => {
    render(<TrainerControls />);

    const volumeSlider = screen.getByTestId('trainer-volume-slider');
    fireEvent.change(volumeSlider, { target: { value: '0.2' } });
    expect(mockSetMasterVolume).toHaveBeenCalledWith(0.2);

    const muteBtn = screen.getByTestId('btn-toggle-mute');
    fireEvent.click(muteBtn);
    expect(mockSetMasterVolume).toHaveBeenCalledWith(0); // Passe à 0 (muet)
  });
});