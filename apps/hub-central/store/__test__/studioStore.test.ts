import { describe, it, expect, beforeEach } from 'vitest';
import { useStudioStore } from '@/store/studioStore';

describe('Store Zustand : useStudioStore', () => {
  // Réinitialiser le store avant chaque test
  beforeEach(() => {
    const initialState = useStudioStore.getState();
    useStudioStore.setState(initialState, true);
  });

  it('🟢 doit initialiser l\'état par défaut correctement', () => {
    const state = useStudioStore.getState();
    
    expect(state.bpm).toBe(120);
    expect(state.isPlaying).toBe(false);
    expect(state.unlockedTracksCount).toBe(4);
    expect(state.tracks).toHaveLength(8);
    
    // Vérification du verrouillage
    expect(state.tracks[0].isLocked).toBe(false);
    expect(state.tracks[4].isLocked).toBe(true);

    // Vérification des Master FX par défaut
    expect(state.masterReverb).toBe(0);
    expect(state.masterDelay).toBe(0);
  });

  it('🟢 doit modifier le BPM et l\'état de lecture', () => {
    useStudioStore.getState().setBpm(130);
    useStudioStore.getState().setIsPlaying(true);
    
    const state = useStudioStore.getState();
    expect(state.bpm).toBe(130);
    expect(state.isPlaying).toBe(true);
  });

  it('🟢 doit assigner un sample à une piste', () => {
    useStudioStore.getState().setTrackSample(1, 'kick.wav', 'Kick Lourd');
    
    const track = useStudioStore.getState().tracks.find(t => t.id === 1);
    expect(track?.sampleUrl).toBe('kick.wav');
    expect(track?.name).toBe('Kick Lourd');
  });

  it('🟢 doit modifier le volume et muter une piste', () => {
    useStudioStore.getState().setTrackVolume(2, 0.5);
    useStudioStore.getState().toggleMute(2);
    
    const track = useStudioStore.getState().tracks.find(t => t.id === 2);
    expect(track?.volume).toBe(0.5);
    expect(track?.isMuted).toBe(true);
  });

  it('🟢 doit déverrouiller la piste suivante (Alvéole)', () => {
    // État initial : 4 pistes déverrouillées (ID 1 à 4)
    useStudioStore.getState().unlockNextTrack();
    
    const state = useStudioStore.getState();
    expect(state.unlockedTracksCount).toBe(5);
    expect(state.tracks.find(t => t.id === 5)?.isLocked).toBe(false);
    expect(state.tracks.find(t => t.id === 6)?.isLocked).toBe(true);
  });

  it('🟢 doit cocher et décocher un pas dans la grille de séquenceur', () => {
    // Cocher le premier pas (index 0) de la piste 1
    useStudioStore.getState().toggleStep(1, 0);
    
    let track = useStudioStore.getState().tracks.find(t => t.id === 1);
    expect(track?.steps[0]).toBe(true);

    // Décocher le même pas
    useStudioStore.getState().toggleStep(1, 0);
    
    track = useStudioStore.getState().tracks.find(t => t.id === 1);
    expect(track?.steps[0]).toBe(false);
  });

  it('🟢 [ROADMAP] doit mettre à jour les Master FX', () => {
    useStudioStore.getState().setMasterReverb(0.6);
    useStudioStore.getState().setMasterDelay(0.3);
    
    const state = useStudioStore.getState();
    expect(state.masterReverb).toBe(0.6);
    expect(state.masterDelay).toBe(0.3);
  });
});