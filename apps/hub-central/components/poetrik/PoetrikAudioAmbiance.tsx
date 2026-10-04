// apps/hub-central/components/poetrik/PoetrikAudioAmbiance.tsx
'use client';

import React, { useRef, useState, useEffect } from 'react';

interface PoetrikAudioAmbianceProps {
  trackUrl?: string;
  trackName?: string;
  autoPlay?: boolean;
}

export const PoetrikAudioAmbiance: React.FC<PoetrikAudioAmbianceProps> = ({
  trackUrl,
  trackName = "Ambiance SamploTek (Défaut)",
  autoPlay = false,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [volume, setVolume] = useState(0.5);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      if (isPlaying) {
        // 🛡️ Correction : Utilisation d'un bloc try/catch ou vérification de promesse pour JSDOM
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => setIsPlaying(false));
        }
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, volume]);

  if (!trackUrl) {
    return null;
  }

  return (
    <div className="flex items-center gap-4 bg-slate-950/80 border border-slate-800 rounded-full px-4 py-2 shadow-lg backdrop-blur-sm">
      <audio ref={audioRef} src={trackUrl} loop data-testid="audio-element" />
      
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${
          isPlaying ? 'bg-indigo-900/50 text-indigo-400 animate-pulse' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
        }`}
        data-testid="play-toggle"
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      <div className="flex flex-col">
        <span className="text-[10px] text-slate-500 uppercase tracking-widest">SamploTek</span>
        <span className="text-xs text-slate-300 truncate max-w-[150px]">{trackName}</span>
      </div>

      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={volume}
        onChange={(e) => setVolume(parseFloat(e.target.value))}
        className="w-20 accent-indigo-500"
        data-testid="volume-slider"
      />
    </div>
  );
};