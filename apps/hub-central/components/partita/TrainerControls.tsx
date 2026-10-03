// apps/hub-central/src/components/partita/TrainerControls.tsx
'use client';

import React from 'react';
import { usePartitaStore } from '../../store/partitaStore';
import { Volume2, VolumeX, Repeat, Clock, Gauge } from 'lucide-react';

interface TrainerControlsProps {
  onToggleMetronome?: () => void;
  onToggleLoop?: () => void;
  isMetronomeActive?: boolean;
}

export const TrainerControls: React.FC<TrainerControlsProps> = ({
  onToggleMetronome,
  isMetronomeActive = false,
}) => {
  const { 
    playbackSpeed, 
    setPlaybackSpeed, 
    masterVolume, 
    setMasterVolume, 
    isLooping, 
    toggleLoop 
  } = usePartitaStore();

  const displaySpeed = Math.round(playbackSpeed * 100);

  return (
    <div 
      className="w-full bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4 font-mono text-xs text-slate-300"
      role="region"
      aria-label="Barre d'outils d'entraînement"
      data-testid="trainer-controls"
    >
      
      {/* ⏱️ Section Vitesse (Ralenti chirurgical) */}
      <div className="flex items-center gap-3 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
        <Gauge size={14} className="text-[#E5484D]" />
        <span className="uppercase text-[10px] text-slate-400">Vitesse :</span>
        <span className="font-bold text-white w-10 text-right" data-testid="trainer-speed-display">
          {displaySpeed}%
        </span>
        <input 
          type="range" 
          data-testid="trainer-speed-slider"
          min="0.25" max="2.0" step="0.05"
          value={playbackSpeed}
          onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
          aria-label="Vitesse de lecture"
          className="w-20 accent-[#E5484D] cursor-pointer"
        />
      </div>

      {/* 🔄 Section Boucle (Répétition infinie du plan) */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleLoop}
          data-testid="btn-toggle-loop"
          aria-pressed={isLooping}
          className={`px-3 py-2 rounded-xl border flex items-center gap-2 transition-all text-[10px] font-black uppercase tracking-wider ${
            isLooping 
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Repeat size={14} className={isLooping ? 'animate-spin' : ''} />
          <span>{isLooping ? 'Boucle Active' : 'Mode Boucle'}</span>
        </button>
      </div>

      {/* 🔊 Section Métronome & Volume Master */}
      <div className="flex items-center gap-4">
        
        {onToggleMetronome && (
          <button
            onClick={onToggleMetronome}
            data-testid="btn-toggle-metronome"
            aria-pressed={isMetronomeActive}
            className={`px-3 py-2 rounded-xl border flex items-center gap-2 transition-all text-[10px] font-black uppercase tracking-wider ${
              isMetronomeActive 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Clock size={14} />
            <span>Métronome</span>
          </button>
        )}

        {/* Volume Master SoundFont */}
        <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
          <button 
            onClick={() => setMasterVolume(masterVolume > 0 ? 0 : 1.0)}
            data-testid="btn-toggle-mute"
            aria-label={masterVolume === 0 ? "Activer le son" : "Couper le son"}
            className="text-slate-400 hover:text-white transition-colors"
          >
            {masterVolume === 0 ? <VolumeX size={14} className="text-red-400" /> : <Volume2 size={14} />}
          </button>
          <input 
            type="range" 
            data-testid="trainer-volume-slider"
            min="0" max="1" step="0.05"
            value={masterVolume}
            onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
            aria-label="Volume principal"
            className="w-16 accent-emerald-500 cursor-pointer"
          />
        </div>

      </div>

    </div>
  );
};