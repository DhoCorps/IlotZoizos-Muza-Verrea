// apps/hub-central/src/hooks/useAlphaTab.ts
'use client';

import { useEffect, useRef, useState } from 'react';
import { usePartitaStore } from '../store/partitaStore';

// On utilise un import dynamique car AlphaTab a besoin du DOM (window) pour fonctionner.
let alphaTabApi: any = null;

export const useAlphaTab = (fileUrl: string) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [api, setApi] = useState<any>(null);
  
  // Extraction des actions du store
  const { 
    setIsLoaded, 
    setIsPlaying, 
    setCurrentTick, 
    setTotalTicks 
  } = usePartitaStore();

  useEffect(() => {
    let currentApi: any = null;

    const initAlphaTab = async () => {
      // 1. Chargement dynamique d'AlphaTab côté client uniquement
      const alphaTabModule = await import('@coderline/alphatab');
      
      if (!containerRef.current) return;

      // 2. Configuration du moteur
      const settings = new alphaTabModule.Settings();
      settings.player.enablePlayer = true;
      // On utilise la SoundFont légère fournie par défaut par AlphaTab via un CDN
      settings.player.soundFont = 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/soundfont/sonivox.sf2';
      settings.core.file = fileUrl; // Le fichier .gp à charger

      // 3. Initialisation de l'API sur le div conteneur
      currentApi = new alphaTabModule.AlphaTabApi(containerRef.current, settings);
      setApi(currentApi);

      // 4. Écoute des événements du moteur AlphaTab
      
      currentApi.scoreLoaded.on((score: any) => {
        setIsLoaded(true);
        // AlphaTab compte la durée en "Ticks" MIDI
        setTotalTicks(score.masterBars[score.masterBars.length - 1].start + score.masterBars[score.masterBars.length - 1].calculateDuration());
      });

      currentApi.playerStateChanged.on((e: any) => {
        setIsPlaying(e.state === 1); // 1 = Playing
      });

      currentApi.playerPositionChanged.on((e: any) => {
        setCurrentTick(e.currentTime);
      });
      
      currentApi.error.on((e: any) => {
         console.error("AlphaTab Engine Error:", e);
      });
    };

    initAlphaTab();

    // Nettoyage lors du démontage du composant
    return () => {
      if (currentApi) {
        currentApi.destroy();
      }
    };
  }, [fileUrl, setIsLoaded, setIsPlaying, setCurrentTick, setTotalTicks]);

  // Exposer les méthodes de contrôle
  const playPause = () => {
    if (api) api.playPause();
  };

  const stop = () => {
    if (api) api.stop();
  };

  const setSpeed = (speed: number) => {
    if (api) {
        api.playbackRange = null; // Retire les boucles si on change la vitesse
        api.playbackSpeed = speed;
    }
  };

  return { containerRef, playPause, stop, setSpeed, api };
};