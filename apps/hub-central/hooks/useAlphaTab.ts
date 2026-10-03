// apps/hub-central/src/hooks/useAlphaTab.ts
'use client';

import { useEffect, useRef, useState } from 'react';
import { usePartitaStore } from '../store/partitaStore';

// Type pour accepter soit une URL, soit un contenu brut (Base64 / ABC / Tab)
interface AlphaTabSource {
  fileUrl?: string;
  rawContent?: string;
}

export const useAlphaTab = ({ fileUrl, rawContent }: AlphaTabSource) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [api, setApi] = useState<any>(null);
  
  // Extraction des actions du store
  const { 
    setIsLoaded, 
    setIsPlaying, 
    setCurrentTick, 
    setTotalTicks,
    resetStore
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
      
      // 🚀 Routage de la source : Privilégie l'URL, sinon utilise le contenu brut (String)
      if (fileUrl) {
          settings.core.file = fileUrl;
      }

      // 3. Initialisation de l'API sur le div conteneur
      currentApi = new alphaTabModule.AlphaTabApi(containerRef.current, settings);
      setApi(currentApi);

      // 🚀 Chargement manuel du contenu brut si aucune URL n'est fournie
      if (!fileUrl && rawContent) {
          // Si c'est du base64 (Guitar Pro), AlphaTab sait le lire via son format binaire
          // Sinon (ABC/Tab), il faut utiliser loadBytes avec un encodage approprié
          try {
             if (rawContent.startsWith('JVBERi0') || rawContent.startsWith('UEsDBB')) { // Heuristique basique Base64
                 const binaryString = window.atob(rawContent);
                 const bytes = new Uint8Array(binaryString.length);
                 for (let i = 0; i < binaryString.length; i++) {
                     bytes[i] = binaryString.charCodeAt(i);
                 }
                 currentApi.loadBytes(bytes);
             } else {
                 // Si c'est du texte pur (AlphaTex), AlphaTab le charge nativement
                 currentApi.tex(rawContent);
             }
          } catch (e) {
             console.error("AlphaTab Content Load Error:", e);
          }
      }

      // 4. Écoute des événements du moteur AlphaTab
      currentApi.scoreLoaded.on((score: any) => {
        setIsLoaded(true);
        // AlphaTab compte la durée en "Ticks" MIDI
        if (score.masterBars && score.masterBars.length > 0) {
           const lastBar = score.masterBars[score.masterBars.length - 1];
           setTotalTicks(lastBar.start + lastBar.calculateDuration());
        }
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

    // 🧹 Nettoyage lors du démontage du composant
    return () => {
      if (currentApi) {
        currentApi.destroy();
      }
      resetStore(); // 🚀 On remet le store à zéro pour ne pas polluer la prochaine partition
    };
  }, [fileUrl, rawContent, setIsLoaded, setIsPlaying, setCurrentTick, setTotalTicks, resetStore]);

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