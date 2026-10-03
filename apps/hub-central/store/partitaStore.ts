// apps/hub-central/src/store/partitaStore.ts
import { create } from 'zustand';

interface PartitaState {
  isLoaded: boolean;
  isPlaying: boolean;
  playbackSpeed: number; // 0.1 à 2.0 (1.0 = 100%)
  currentTick: number;   // Position actuelle dans le temps
  totalTicks: number;    // Durée totale
  masterVolume: number;  // 0.0 à 1.0
  isLooping: boolean;    
  
  // Actions
  setIsLoaded: (loaded: boolean) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setCurrentTick: (tick: number) => void;
  setTotalTicks: (ticks: number) => void;
  setMasterVolume: (volume: number) => void;
  toggleLoop: () => void;
  resetStore: () => void; // 🚀 Permet de nettoyer l'état au démontage
}

const initialState = {
  isLoaded: false,
  isPlaying: false,
  playbackSpeed: 1.0,
  currentTick: 0,
  totalTicks: 0,
  masterVolume: 1.0,
  isLooping: false,
};

export const usePartitaStore = create<PartitaState>((set) => ({
  ...initialState,

  setIsLoaded: (isLoaded) => set({ isLoaded }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  
  // 🚀 Sécurisation : On contraint la vitesse entre 0.1x et 2.0x
  setPlaybackSpeed: (speed) => set({ playbackSpeed: Math.max(0.1, Math.min(speed, 2.0)) }),
  
  // 🚀 Sécurisation : Pas de temps négatif
  setCurrentTick: (tick) => set({ currentTick: Math.max(0, tick) }),
  setTotalTicks: (ticks) => set({ totalTicks: Math.max(0, ticks) }),
  
  // 🚀 Sécurisation : On contraint le volume entre 0 (muet) et 1 (max)
  setMasterVolume: (volume) => set({ masterVolume: Math.max(0, Math.min(volume, 1.0)) }),
  
  toggleLoop: () => set((state) => ({ isLooping: !state.isLooping })),
  
  // 🚀 Remise à zéro propre pour le changement de partition
  resetStore: () => set(initialState),
}));