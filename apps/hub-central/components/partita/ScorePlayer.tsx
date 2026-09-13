// apps/hub-central/src/components/partita/ScorePlayer.tsx
'use client';

import React from 'react';
import { useAlphaTab } from '../../hooks/useAlphaTab';
import { usePartitaStore } from '../../store/partitaStore';
import { Play, Pause, Square, Loader2 } from 'lucide-react';

interface ScorePlayerProps {
  fileUrl: string;
}

export const ScorePlayer: React.FC<ScorePlayerProps> = ({ fileUrl }) => {
  // Initialisation du moteur sur le fichier cible
  const { containerRef, playPause, stop, setSpeed } = useAlphaTab(fileUrl);
  
  // État du lecteur
  const { isLoaded, isPlaying, playbackSpeed, setPlaybackSpeed } = usePartitaStore();

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSpeed = parseFloat(e.target.value);
    setPlaybackSpeed(newSpeed);
    setSpeed(newSpeed);
  };

  return (
    <div className="w-full bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col">
      
      {/* 1. BARRE DE CONTRÔLE (TrainerControls) */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
        
        <div className="flex items-center gap-2">
          <button 
            onClick={playPause}
            disabled={!isLoaded}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              isPlaying ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white hover:bg-emerald-500'
            } disabled:opacity-50`}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-1" />}
          </button>
          
          <button 
            onClick={stop}
            disabled={!isLoaded}
            className="w-10 h-10 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-all disabled:opacity-50"
          >
            <Square size={14} />
          </button>
        </div>

        {/* Contrôle de la Vitesse */}
        <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
            Vitesse : {Math.round(playbackSpeed * 100)}%
          </span>
          <input 
            type="range" 
            min="0.25" max="2.0" step="0.05"
            value={playbackSpeed}
            onChange={handleSpeedChange}
            disabled={!isLoaded}
            className="w-24 accent-[#E5484D] cursor-pointer"
          />
        </div>

      </div>

      {/* 2. ZONE DE RENDU DE LA PARTITION (AlphaTab) */}
      <div className="relative w-full h-[600px] overflow-auto bg-[#F8F9FA] p-8 custom-scrollbar">
        {!isLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/50 backdrop-blur-sm z-10">
            <Loader2 className="w-10 h-10 text-[#E5484D] animate-spin mb-4" />
            <p className="text-xs font-mono text-white uppercase tracking-widest animate-pulse">
              Déchiffrement de l'œuvre...
            </p>
          </div>
        )}
        
        {/* C'est ici qu'AlphaTab va dessiner le SVG de la partition */}
        <div ref={containerRef} className="alphatab-container" />
      </div>

    </div>
  );
};