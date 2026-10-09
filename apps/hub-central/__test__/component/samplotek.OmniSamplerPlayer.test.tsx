import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OmniSamplerPlayer } from '@/components/samplotek/OmniSamplerPlayer';
import { toast } from 'sonner';
import { useStudioStore } from '@/store/studioStore';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES HOOKS
// -------------------------------------------------------------------------
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock du moteur audio Tone.js (On expose les fonctions)
const mockEngineToggleMasterPlay = vi.fn();
const mockEngineSetBpm = vi.fn();
const mockEngineSetTrackVolume = vi.fn();
const mockEngineToggleMute = vi.fn();
const mockEngineSetTrackSample = vi.fn();

vi.mock('@/hooks/useOmniSamplerEngine', () => ({
  useOmniSamplerEngine: vi.fn(() => ({
    tracks: [],
    bpm: 120,
    isPlaying: false,
    toggleMasterPlay: mockEngineToggleMasterPlay,
    setBpm: mockEngineSetBpm,
    setTrackVolume: mockEngineSetTrackVolume,
    toggleMute: mockEngineToggleMute,
    setTrackSample: mockEngineSetTrackSample,
  })),
}));

// Mock du store Zustand
vi.mock('@/store/studioStore', () => ({
  useStudioStore: vi.fn(),
}));

const mockTracks = [
  { id: 1, name: 'Kick', sampleUrl: 'kick.wav', volume: 0.8, isMuted: false, isLocked: false, steps: Array(16).fill(false) },
  { id: 2, name: 'Snare', sampleUrl: 'snare.wav', volume: 0.8, isMuted: true, isLocked: false, steps: Array(16).fill(false) },
  { id: 3, name: 'Piste 3', sampleUrl: null, volume: 0.8, isMuted: false, isLocked: true, steps: Array(16).fill(false) },
];

describe('Composant : OmniSamplerPlayer', () => {
  let mockFetch: any;
  const mockSetIsPlaying = vi.fn();
  const mockUnlockNextTrack = vi.fn();
  const mockSetBpm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Configuration par défaut du mock du store
    (useStudioStore as unknown as any).mockReturnValue({
      bpm: 120,
      isPlaying: false,
      tracks: mockTracks,
      setBpm: mockSetBpm,
      setIsPlaying: mockSetIsPlaying,
      toggleMute: vi.fn(),
      setTrackVolume: vi.fn(),
      unlockNextTrack: mockUnlockNextTrack,
    });

    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: 'Action réussie' }),
    });
    vi.stubGlobal('fetch', mockFetch);
  });

  it('🟢 doit afficher correctement le Header avec le BPM et les pistes actives', () => {
    render(<OmniSamplerPlayer />);
    
    // Vérifie le décompte des pistes (2 actives sur 3)
    expect(screen.getByText('2 Pistes Actives')).toBeDefined();
  });

  it('🟢 doit synchroniser la lecture (Play / Pause) entre Zustand et le Moteur', () => {
    render(<OmniSamplerPlayer />);
    
    const playBtn = screen.getByText('Lancer le Master');
    fireEvent.click(playBtn);
    
    // Vérification du pont : Les deux systèmes sont appelés
    expect(mockSetIsPlaying).toHaveBeenCalledWith(true);
    expect(mockEngineToggleMasterPlay).toHaveBeenCalled();
  });

  it('🟢 doit synchroniser le changement de BPM entre Zustand et le Moteur', () => {
    render(<OmniSamplerPlayer />);
    
    const bpmInput = screen.getByDisplayValue('120');
    fireEvent.change(bpmInput, { target: { value: '130' } });
    
    // Vérification du pont : Les deux systèmes sont mis à jour
    expect(mockSetBpm).toHaveBeenCalledWith(130);
    expect(mockEngineSetBpm).toHaveBeenCalledWith(130);
  });

  it('🟢 doit interagir avec l\'API d\'économie pour déverrouiller une piste', async () => {
    render(<OmniSamplerPlayer />);
    
    const unlockBtn = screen.getByText('Déverrouiller');
    fireEvent.click(unlockBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/economy/alveole/unlock', expect.objectContaining({ method: 'POST' }));
    });

    expect(toast.success).toHaveBeenCalled();
    expect(mockUnlockNextTrack).toHaveBeenCalled();
  });
});