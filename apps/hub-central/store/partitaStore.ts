// apps/hub-central/src/store/partitaStore.ts
import { create } from 'zustand';

interface PartitaState {
  isLoaded: boolean;
  isPlaying: boolean;
  playbackSpeed: number; // 0.1 à 2.0 (1.0 = 100%)
  currentTick: number;   // Position actuelle dans le temps
  totalTicks: number;    // Durée totale
  masterVolume: number;  // 0 à 1
  isLooping: boolean;    
  
  // Actions
  setIsLoaded: (loaded: boolean) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setCurrentTick: (tick: number) => void;
  setTotalTicks: (ticks: number) => void;
  setMasterVolume: (volume: number) => void;
  toggleLoop: () => void;
}

export const usePartitaStore = create<PartitaState>((set) => ({
  isLoaded: false,
  isPlaying: false,
  playbackSpeed: 1.0,
  currentTick: 0,
  totalTicks: 0,
  masterVolume: 1.0,
  isLooping: false,

  setIsLoaded: (isLoaded) => set({ isLoaded }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  setCurrentTick: (currentTick) => set({ currentTick }),
  setTotalTicks: (totalTicks) => set({ totalTicks }),
  setMasterVolume: (masterVolume) => set({ masterVolume }),
  toggleLoop: () => set((state) => ({ isLooping: !state.isLooping })),
}));