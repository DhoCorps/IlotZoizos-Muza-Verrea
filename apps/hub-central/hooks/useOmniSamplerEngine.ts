import { useState, useRef, useEffect } from 'react';
import * as Tone from 'tone';

export interface SamplerTrack {
  id: number;
  name: string;
  url: string | null;
  volume: number; // Gain linéaire (0 à 1) converti en dB par Tone
  isMuted: boolean;
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
    }))
  );

  // 🎛️ Racks et Lecteurs
  const playersRef = useRef<Map<number, Tone.Player>>(new Map());
  const previewPlayerRef = useRef<Tone.Player | null>(null);
  
  // Rack d'effets Master (Global)
  const masterEffectsRef = useRef<{
    reverb: Tone.Reverb;
    delay: Tone.FeedbackDelay;
    filter: Tone.Filter;
    volume: Tone.Volume;
  } | null>(null);

  // 1️⃣ Initialisation du Bus Master et des Effets (Au montage)
  useEffect(() => {
    // Création des effets selon la Roadmap
    const reverb = new Tone.Reverb({ decay: 2.5, wet: 0 }); 
    const delay = new Tone.FeedbackDelay("8n", 0.5);
    delay.wet.value = 0; 
    const filter = new Tone.Filter(20000, "lowpass");
    const masterVol = new Tone.Volume(0);

    // 🎚️ Chainage : Pistes -> Volume Master -> Filtre -> Delay -> Reverb -> Sortie
    masterVol.chain(filter, delay, reverb, Tone.Destination);
    masterEffectsRef.current = { reverb, delay, filter, volume: masterVol };

    return () => {
      // Nettoyage de la mémoire au démontage
      reverb.dispose();
      delay.dispose();
      filter.dispose();
      masterVol.dispose();
      if (previewPlayerRef.current) previewPlayerRef.current.dispose();
      playersRef.current.forEach(p => p.dispose());
    };
  }, []);

  // 2️⃣ Synchronisation du BPM avec le Transporteur global
  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  // ==========================================================
  // 🎧 ROADMAP : PRÉ-ÉCOUTE INTELLIGENTE
  // ==========================================================
  const previewSample = async (url: string) => {
    await Tone.start(); // Dévérouille l'AudioContext du navigateur

    // Stoppe et détruit le sample A si on lance le B
    if (previewPlayerRef.current) {
      previewPlayerRef.current.stop();
      previewPlayerRef.current.dispose();
    }

    try {
      // On connecte la pré-écoute directement à la sortie (bypass des effets master)
      const player = new Tone.Player(url).toDestination();
      await player.load(url);
      player.start();
      previewPlayerRef.current = player;
    } catch (err) {
      console.error(`🔥 Erreur de pré-écoute sur : ${url}`, err);
    }
  };

  const stopPreview = () => {
    if (previewPlayerRef.current) {
      previewPlayerRef.current.stop();
    }
  };

  // ==========================================================
  // 🎚️ GESTION DES PISTES (Mixer)
  // ==========================================================
  const setTrackSample = (trackId: number, url: string, name: string) => {
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, url, name } : t));
  };

  const setTrackVolume = (trackId: number, volume: number) => {
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, volume } : t));
    const player = playersRef.current.get(trackId);
    if (player) {
      player.volume.value = Tone.gainToDb(volume);
    }
  };

  const toggleMute = (trackId: number) => {
    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        const nextMuted = !t.isMuted;
        const player = playersRef.current.get(trackId);
        if (player) player.mute = nextMuted;
        return { ...t, isMuted: nextMuted };
      }
      return t;
    }));
  };

  // ==========================================================
  // 🎛️ ROADMAP : CONTRÔLE DES EFFETS MASTER
  // ==========================================================
  const setMasterEffect = (effect: 'reverb' | 'delay', wetValue: number) => {
    if (masterEffectsRef.current) {
      masterEffectsRef.current[effect].wet.value = wetValue; // 0 (Dry) à 1 (Wet)
    }
  };

  const setMasterFilter = (frequency: number) => {
     if (masterEffectsRef.current) {
       masterEffectsRef.current.filter.frequency.value = frequency;
     }
  };

  // ==========================================================
  // 🚀 LECTURE GLOBALE (Transport)
  // ==========================================================
  const startMasterPlay = async () => {
    await Tone.start();
    stopMasterPlay(); // Arrêt propre de l'existant

    if (!masterEffectsRef.current) return;

    for (const track of tracks) {
      if (!track.url) continue;
      try {
        const player = new Tone.Player({
          url: track.url,
          loop: true,
          volume: Tone.gainToDb(track.volume),
          mute: track.isMuted
        }).connect(masterEffectsRef.current.volume); // Routage vers le Bus Master

        await player.load(track.url);
        playersRef.current.set(track.id, player);
        player.sync().start(0); // Synchronise avec le métronome Tone.Transport
      } catch (err) {
        console.error(`🔥 Erreur de lecture sur la piste ${track.id}:`, err);
      }
    }
    
    Tone.Transport.start();
    setIsPlaying(true);
  };

  const stopMasterPlay = () => {
    Tone.Transport.stop();
    Tone.Transport.cancel(0); // Nettoie la timeline
    
    playersRef.current.forEach(player => {
        player.unsync();
        player.stop();
        player.dispose();
    });
    playersRef.current.clear();
    setIsPlaying(false);
  };

  const toggleMasterPlay = () => {
    if (isPlaying) stopMasterPlay();
    else startMasterPlay();
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
    previewSample,
    stopPreview,
    setMasterEffect,
    setMasterFilter
  };
}