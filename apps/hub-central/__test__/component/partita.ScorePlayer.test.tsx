// apps/hub-central/src/components/partita/__tests__/ScorePlayer.test.tsx
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScorePlayer } from '@/components/partita/ScorePlayer';
import { usePartitaStore } from '@/store/partitaStore';
import { useAlphaTab } from '@/hooks/useAlphaTab';

// -------------------------------------------------------------------------
// 🎭 MOCKS DES CHEMINS DU HOOK ET DU STORE
// -------------------------------------------------------------------------
vi.mock('@/hooks/useAlphaTab', () => ({
  useAlphaTab: vi.fn(),
}));

vi.mock('@/store/partitaStore', () => ({
  usePartitaStore: vi.fn(),
}));

describe('ScorePlayer Component', () => {
  const mockPlayPause = vi.fn();
  const mockStop = vi.fn();
  const mockSetSpeed = vi.fn();
  const mockSetPlaybackSpeed = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Comportement par défaut du hook AlphaTab
    vi.mocked(useAlphaTab).mockReturnValue({
      containerRef: { current: null },
      playPause: mockPlayPause,
      stop: mockStop,
      setSpeed: mockSetSpeed,
      api: {}
    } as any);

    // Comportement par défaut du store (Partition chargée, à l'arrêt, vitesse 100%)
    vi.mocked(usePartitaStore).mockReturnValue({
      isLoaded: true,
      isPlaying: false,
      playbackSpeed: 1.0,
      setPlaybackSpeed: mockSetPlaybackSpeed,
      masterVolume: 1.0,
      setMasterVolume: vi.fn(),
      isLooping: false,
      toggleLoop: vi.fn(),
    } as any);
  });

  it('🟢 doit afficher l\'overlay de chargement si la partition n\'est pas encore prête', () => {
    vi.mocked(usePartitaStore).mockReturnValueOnce({
      isLoaded: false,
      isPlaying: false,
      playbackSpeed: 1.0,
      setPlaybackSpeed: mockSetPlaybackSpeed,
      masterVolume: 1.0,
    } as any);

    render(<ScorePlayer fileUrl="https://mock.com/file.gp" />);
    
    expect(screen.getByTestId('loading-overlay')).toBeInTheDocument();
    expect(screen.getByText(/Déchiffrement de l'œuvre/i)).toBeInTheDocument();
    
    // Les boutons doivent être désactivés
    expect(screen.getByTestId('btn-play-pause')).toBeDisabled();
    expect(screen.getByTestId('speed-slider')).toBeDisabled();
  });

  it('🟢 doit masquer l\'overlay et activer les contrôles quand isLoaded est true', () => {
    render(<ScorePlayer fileUrl="https://mock.com/file.gp" />);
    
    expect(screen.queryByTestId('loading-overlay')).not.toBeInTheDocument();
    expect(screen.getByTestId('btn-play-pause')).not.toBeDisabled();
    expect(screen.getByTestId('speed-slider')).not.toBeDisabled();
    
    // 🚀 Correction ici : on cible le vrai data-testid rendu par TrainerControls
    expect(screen.getByTestId('trainer-controls')).toBeInTheDocument();
  });

  it('🟢 doit déclencher playPause et stop via les boutons', () => {
    render(<ScorePlayer fileUrl="https://mock.com/file.gp" />);
    
    const playButton = screen.getByTestId('btn-play-pause');
    const stopButton = screen.getByTestId('btn-stop');

    fireEvent.click(playButton);
    expect(mockPlayPause).toHaveBeenCalledTimes(1);

    fireEvent.click(stopButton);
    expect(mockStop).toHaveBeenCalledTimes(1);
  });

  it('🟢 doit mettre à jour la vitesse dans le store ET dans AlphaTab lors de l\'utilisation du slider', () => {
    render(<ScorePlayer fileUrl="https://mock.com/file.gp" />);
    
    const slider = screen.getByTestId('speed-slider');
    
    // Changement de vitesse à 1.5 (150%)
    fireEvent.change(slider, { target: { value: '1.5' } });

    expect(mockSetPlaybackSpeed).toHaveBeenCalledWith(1.5);
    expect(mockSetSpeed).toHaveBeenCalledWith(1.5);
  });

  it('🟢 doit afficher correctement le pourcentage de vitesse', () => {
    vi.mocked(usePartitaStore).mockReturnValueOnce({
      isLoaded: true,
      isPlaying: false,
      playbackSpeed: 0.75, // 75%
      setPlaybackSpeed: mockSetPlaybackSpeed,
      masterVolume: 1.0,
    } as any);

    render(<ScorePlayer fileUrl="https://mock.com/file.gp" />);
    
    expect(screen.getByTestId('speed-display')).toHaveTextContent('75');
  });
});