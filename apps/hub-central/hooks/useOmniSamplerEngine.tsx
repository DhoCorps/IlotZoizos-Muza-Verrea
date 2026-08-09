// apps/hub-central/hooks/useOmniSamplerEngine.ts
import { useState, useRef, useEffect, useCallback } from 'react';

export interface SamplerTrack {
  id: number;
  name: string;
  url: string | null;
  volume: number; // 0 à 1
  isMuted: boolean;
  isPlaying: boolean;
}

export function useOmniSamplerEngine(maxTracks: number = 6) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [tracks, setTracks] = useState<SamplerTrack[]>(() =>
    Array.from({ length: maxTracks }, (_, i) => ({
      id: i + 1,
      name: `Piste ${i + 1}`,
      url: null,
      volume: 0.8,
      isMuted: false,
      isPlaying: false,
    }))
  );

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodesRef = useRef<Map<number, { source: AudioBufferSourceNode; gain: GainNode }>>(new Map());
  const bufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map());

  // Initialisation du contexte audio au premier clic utilisateur
  const initAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioContextClass();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  // Chargement d'un buffer audio
  const loadBuffer = async (url: string): Promise<AudioBuffer> => {
    if (bufferCacheRef.current.has(url)) {
      return bufferCacheRef.current.get(url)!;
    }
    initAudioContext();
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    const decodedBuffer = await audioCtxRef.current!.decodeAudioData(arrayBuffer);
    bufferCacheRef.current.set(url, decodedBuffer);
    return decodedBuffer;
  };

  // Assigner un sample à une piste
  const setTrackSample = async (trackId: number, url: string, name: string) => {
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, url, name } : t));
  };

  // Modifier le volume d'une piste en temps réel
  const setTrackVolume = (trackId: number, volume: number) => {
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, volume } : t));
    const nodeEntry = sourceNodesRef.current.get(trackId);
    if (nodeEntry) {
      nodeEntry.gain.gain.value = volume;
    }
  };

  // Toggle Mute
  const toggleMute = (trackId: number) => {
    setTracks(prev => prev.map(t => {
      const nextMuted = !t.isMuted;
      const nodeEntry = sourceNodesRef.current.get(trackId);
      if (nodeEntry) {
        nodeEntry.gain.gain.value = nextMuted ? 0 : t.volume;
      }
      return { ...t, isMuted: nextMuted };
    }));
  };

  // Démarrer la lecture de toutes les pistes chargées (Boucle style E-Jay)
  const startMasterPlay = async () => {
    initAudioContext();
    if (!audioCtxRef.current) return;

    // Arrêter proprement les pistes en cours
    stopMasterPlay();

    const now = audioCtxRef.current.currentTime;

    for (const track of tracks) {
      if (!track.url) continue;

      try {
        const buffer = await loadBuffer(track.url);
        const source = audioCtxRef.current.createBufferSource();
        const gainNode = audioCtxRef.current.createGain();

        source.buffer = buffer;
        source.loop = true; // Lecture en boucle synchronisée
        gainNode.gain.value = track.isMuted ? 0 : track.volume;

        source.connect(gainNode);
        gainNode.connect(audioCtxRef.current.destination);

        source.start(now);
        sourceNodesRef.current.set(track.id, { source, gain: gainNode });
      } catch (err) {
        console.error(`Erreur de lecture sur la piste ${track.id}:`, err);
      }
    }

    setIsPlaying(true);
  };

  // Arrêter la lecture globale
  const stopMasterPlay = () => {
    sourceNodesRef.current.forEach(({ source }) => {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // Ignorer si déjà arrêté
      }
    });
    sourceNodesRef.current.clear();
    setIsPlaying(false);
  };

  const toggleMasterPlay = () => {
    if (isPlaying) {
      stopMasterPlay();
    } else {
      startMasterPlay();
    }
  };

  return {
    tracks,
    isPlaying,
    bpm,
    setBpm,
    setTrackSample,
    setTrackVolume,
    toggleMute,
    toggleMasterPlay,
    stopMasterPlay,
  };
}