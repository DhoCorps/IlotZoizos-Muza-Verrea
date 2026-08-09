import React from 'react';
import { Disc, Music } from 'lucide-react';

interface AudioMediaViewerProps {
  title: string;
  ownerSlug: string;
  thumbnailUrl?: string;
  isPlaying: boolean;
}

export const AudioMediaViewer: React.FC<AudioMediaViewerProps> = ({ title, ownerSlug, thumbnailUrl, isPlaying }) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-8 p-8 animate-in fade-in duration-500">
      <div className={`relative w-48 h-48 sm:w-64 sm:h-64 rounded-full p-2 bg-gradient-to-tr from-slate-900 to-slate-800 border border-slate-700 shadow-[0_0_40px_rgba(220,38,38,0.15)] ${isPlaying ? 'animate-spin duration-[10000ms]' : ''}`}>
        <div className="w-full h-full rounded-full overflow-hidden relative flex items-center justify-center bg-black">
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover opacity-80" />
          ) : (
            <Music size={64} className="text-red-500/50" />
          )}
          {/* Trou central du vinyle */}
          <div className="absolute w-12 h-12 bg-slate-950 border-2 border-slate-700 rounded-full flex items-center justify-center">
            <Disc size={16} className="text-red-500 animate-pulse" />
          </div>
        </div>
      </div>

      <div className="text-center space-y-2">
        <span className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-mono uppercase tracking-widest rounded-full">
          Partition Sonore • Partita
        </span>
        <h2 className="text-2xl font-black text-slate-100 tracking-tight">{title}</h2>
        <p className="text-xs font-mono text-slate-400">Composé par @{ownerSlug}</p>
      </div>
    </div>
  );
};