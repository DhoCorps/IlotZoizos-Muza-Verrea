'use client';

import React from 'react';
import { useStudioStore, StudioTrack } from '../../store/studioStore';
import { useOmniSamplerEngine } from '../../hooks/useOmniSamplerEngine';
import { Play, Pause, Volume2, VolumeX, Lock, Sparkles, Sliders } from 'lucide-react';
import { toast } from 'sonner';

interface OmniSamplerPlayerProps {
  maxTracks?: number;
}

export const OmniSamplerPlayer: React.FC<OmniSamplerPlayerProps> = () => {
  // 1. On récupère tout l'état et les actions depuis le store global Zustand
  const { 
    tracks, 
    isPlaying, 
    bpm, 
    setBpm, 
    setTrackVolume, 
    toggleMute, 
    setIsPlaying, 
    unlockNextTrack 
  } = useStudioStore();

  // 2. On branche proprement le moteur audio Tone.js avec les paramètres du store
  useOmniSamplerEngine(tracks, isPlaying, bpm);

  const handleUnlockAttempt = async () => {
    try {
      const res = await fetch('/api/economy/alveole/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureId: 'samplotek_track_5' })
      });
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || 'Ressources insuffisantes dans l’Alvéole.');
      }

      unlockNextTrack();
      toast.success('Canal expert déverrouillé avec succès ! 💿🍅');
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message || 'Impossible de briser le cadenas.');
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-6 bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl space-y-8 text-white">
      
      {/* HEADER MASTER DU STUDIO */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sliders className="text-red-500" size={20} />
            <h2 className="text-xl font-black uppercase tracking-wider">SamploTek • Studio E-Jay</h2>
          </div>
          <p className="text-xs font-mono text-slate-400">
            Moteur synchrone Tone.js • <span className="text-red-400 font-bold">{tracks.filter((t: StudioTrack) => !t.isLocked).length} Pistes Actives</span>
          </p>
        </div>

        {/* Contrôles Master & BPM */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl">
            <span className="text-[10px] font-mono text-slate-400">BPM</span>
            <input 
              type="number" 
              value={bpm} 
              onChange={(e) => setBpm(Number(e.target.value))}
              className="w-12 bg-transparent text-center font-bold text-red-500 focus:outline-none"
            />
          </div>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2 shadow-lg transition-all ${
              isPlaying ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30' : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30 hover:scale-105'
            }`}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            {isPlaying ? 'Stopper le Master' : 'Lancer le Master'}
          </button>
        </div>
      </div>

      {/* GRILLE DES PISTES (Typage explicite de track et index) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {tracks.map((track: StudioTrack) => (
          <div 
            key={track.id}
            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
              track.isLocked 
                ? 'bg-slate-900/20 border-slate-800/50 opacity-60' 
                : 'bg-slate-900/60 border-slate-800 backdrop-blur-md shadow-lg hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-400">{track.name}</span>
              {track.isLocked ? (
                <button 
                  onClick={handleUnlockAttempt}
                  className="flex items-center gap-1 text-[9px] font-mono text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 hover:bg-amber-500/20 transition-colors cursor-pointer"
                  title="Cliquer pour dépenser Vinyles & Totamtoes"
                >
                  <Lock size={10} /> Déverrouiller
                </button>
              ) : (
                <button 
                  onClick={() => toggleMute(track.id)}
                  className={`p-1.5 rounded-lg transition-colors ${track.isMuted ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-300 hover:text-white'}`}
                >
                  {track.isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
              )}
            </div>

            {/* État du Sample */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 text-center">
              <p className="text-[11px] font-mono text-slate-300 truncate">
                {track.isLocked ? "🔒 Canal Verrouillé" : track.sampleUrl ? track.name : "Aucun sample assigné"}
              </p>
            </div>

            {/* Fader de Volume */}
            <div className="flex items-center gap-3 pt-2 border-t border-slate-800/50">
              <span className="text-[10px] font-mono text-slate-500">VOL</span>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01"
                value={track.volume}
                disabled={track.isLocked || track.isMuted}
                onChange={(e) => setTrackVolume(track.id, parseFloat(e.target.value))}
                className="w-full accent-red-600 bg-slate-800 h-1 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        ))}
      </div>

      {/* BANDEAU D'INFORMATION D'ÉVOLUTION */}
      <div className="p-4 bg-gradient-to-r from-red-950/30 via-slate-900 to-slate-900 border border-red-500/20 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="text-red-400 animate-pulse" size={20} />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Expansion de SamploTek</h4>
            <p className="text-[11px] font-mono text-slate-400">Dépensez vos Sillons de Vinyle (Partita) et Totamtoes (Jeux) pour libérer de nouvelles pistes.</p>
          </div>
        </div>
        <span className="text-xs font-mono font-bold text-red-400">{tracks.filter((t: StudioTrack) => !t.isLocked).length} / 8 Pistes</span>
      </div>

    </div>
  );
};