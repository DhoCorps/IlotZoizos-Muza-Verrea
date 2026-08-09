import { create } from 'zustand';

export interface StudioTrack {
  id: number;
  name: string;
  sampleUrl: string | null;
  volume: number; // 0 à 1
  isMuted: boolean;
  isLocked: boolean;
}

interface StudioState {
  bpm: number;
  isPlaying: boolean;
  unlockedTracksCount: number; // Commence à 4, évolue jusqu'à 8
  tracks: StudioTrack[];
  
  setBpm: (bpm: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setTrackSample: (trackId: number, url: string, name: string) => void;
  setTrackVolume: (trackId: number, volume: number) => void;
  toggleMute: (trackId: number) => void;
  unlockNextTrack: () => void;
}

export const useStudioStore = create<StudioState>((set) => ({
  bpm: 120,
  isPlaying: false,
  unlockedTracksCount: 4, // 4 pistes par défaut au commencement
  tracks: Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    name: `Piste 0${i + 1}`,
    sampleUrl: null,
    volume: 0.8,
    isMuted: false,
    isLocked: i >= 4, // Les pistes 5 à 8 sont verrouillées par défaut
  })),

  setBpm: (bpm) => set({ bpm }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),

  setTrackSample: (trackId, url, name) => set((state) => ({
    tracks: state.tracks.map((t) => t.id === trackId ? { ...t, sampleUrl: url, name } : t)
  })),

  setTrackVolume: (trackId, volume) => set((state) => ({
    tracks: state.tracks.map((t) => t.id === trackId ? { ...t, volume } : t)
  })),

  toggleMute: (trackId) => set((state) => ({
    tracks: state.tracks.map((t) => t.id === trackId ? { ...t, isMuted: !t.isMuted } : t)
  })),

  unlockNextTrack: () => set((state) => {
    if (state.unlockedTracksCount >= 8) return state;
    const nextCount = state.unlockedTracksCount + 1;
    return {
      unlockedTracksCount: nextCount,
      tracks: state.tracks.map((t) => t.id <= nextCount ? { ...t, isLocked: false } : t)
    };
  }),
}));