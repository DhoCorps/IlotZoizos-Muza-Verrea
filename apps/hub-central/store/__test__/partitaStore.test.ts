// apps/hub-central/src/store/__tests__/partitaStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { usePartitaStore } from '../partitaStore';

describe('Store : PartitaStore', () => {
  // Réinitialise le store avant chaque test pour éviter les fuites d'état
  beforeEach(() => {
    usePartitaStore.getState().resetStore();
  });

  it('🟢 doit s\'initialiser avec les valeurs par défaut', () => {
    const state = usePartitaStore.getState();
    expect(state.isLoaded).toBe(false);
    expect(state.isPlaying).toBe(false);
    expect(state.playbackSpeed).toBe(1.0);
    expect(state.masterVolume).toBe(1.0);
    expect(state.isLooping).toBe(false);
    expect(state.currentTick).toBe(0);
  });

  it('🟢 doit mettre à jour les états booléens correctement', () => {
    const { setIsLoaded, setIsPlaying, toggleLoop } = usePartitaStore.getState();
    
    setIsLoaded(true);
    setIsPlaying(true);
    toggleLoop();

    const state = usePartitaStore.getState();
    expect(state.isLoaded).toBe(true);
    expect(state.isPlaying).toBe(true);
    expect(state.isLooping).toBe(true);
  });

  it('🟢 doit borner la vitesse de lecture (playbackSpeed) entre 0.1 et 2.0', () => {
    const { setPlaybackSpeed } = usePartitaStore.getState();
    
    // Cas nominal
    setPlaybackSpeed(1.5);
    expect(usePartitaStore.getState().playbackSpeed).toBe(1.5);

    // Tentative de dépasser la limite inférieure
    setPlaybackSpeed(-0.5);
    expect(usePartitaStore.getState().playbackSpeed).toBe(0.1);

    // Tentative de dépasser la limite supérieure
    setPlaybackSpeed(3.0);
    expect(usePartitaStore.getState().playbackSpeed).toBe(2.0);
  });

  it('🟢 doit borner le volume (masterVolume) entre 0 et 1', () => {
    const { setMasterVolume } = usePartitaStore.getState();
    
    // Cas nominal
    setMasterVolume(0.5);
    expect(usePartitaStore.getState().masterVolume).toBe(0.5);

    // Tentative de dépasser la limite inférieure
    setMasterVolume(-10);
    expect(usePartitaStore.getState().masterVolume).toBe(0);

    // Tentative de dépasser la limite supérieure
    setMasterVolume(1.5);
    expect(usePartitaStore.getState().masterVolume).toBe(1.0);
  });

  it('🟢 doit empêcher les ticks négatifs sur la timeline', () => {
    const { setCurrentTick, setTotalTicks } = usePartitaStore.getState();
    
    setCurrentTick(-50);
    setTotalTicks(-100);

    const state = usePartitaStore.getState();
    expect(state.currentTick).toBe(0);
    expect(state.totalTicks).toBe(0);
  });
  
  it('🟢 doit réinitialiser le store complètement avec resetStore', () => {
    const { setIsLoaded, setPlaybackSpeed, setMasterVolume, resetStore } = usePartitaStore.getState();
    
    setIsLoaded(true);
    setPlaybackSpeed(1.5);
    setMasterVolume(0.3);
    
    resetStore();
    
    const state = usePartitaStore.getState();
    expect(state.isLoaded).toBe(false);
    expect(state.playbackSpeed).toBe(1.0);
    expect(state.masterVolume).toBe(1.0);
  });
});