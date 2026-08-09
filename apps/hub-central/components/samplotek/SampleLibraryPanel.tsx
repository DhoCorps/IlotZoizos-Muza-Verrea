'use client';

import React from 'react';
import { Search, Disc, Play, Plus, SlidersHorizontal } from 'lucide-react';
import { useSampleFilter } from '../../hooks/useSampleFilter';

interface SampleLibraryPanelProps {
  samples: any[];
  onSelectSample: (sample: any) => void;
  onOpenUploadModal: () => void;
}

export const SampleLibraryPanel: React.FC<SampleLibraryPanelProps> = ({ samples, onSelectSample, onOpenUploadModal }) => {
  const {
    searchQuery,
    setSearchQuery,
    selectedStyle,
    setSelectedStyle,
    filteredSamples,
  } = useSampleFilter(samples);

  return (
    <div className="w-full h-full bg-slate-950 border-r border-slate-800 flex flex-col p-4 space-y-4 text-white">
      
      {/* HEADER & BOUTON UPLOAD */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Disc className="text-red-500 animate-spin duration-[8000ms]" size={18} />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">Banque de Sons</h3>
        </div>
        <button 
          onClick={onOpenUploadModal}
          className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold uppercase text-[10px] tracking-wider rounded-xl transition-all shadow-lg flex items-center gap-1"
        >
          <Plus size={14} /> Graver
        </button>
      </div>

      {/* BARRE DE RECHERCHE INSTANTANÉE */}
      <div className="relative">
        <Search className="absolute left-3 top-3 text-slate-500" size={14} />
        <input 
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher un sample..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-red-500 transition-colors"
        />
      </div>

      {/* LISTE DES SAMPLES FILTRÉS */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {filteredSamples.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs font-mono">
            Aucun sample trouvé dans la Canopée.
          </div>
        ) : (
          filteredSamples.map((sample) => (
            <div 
              key={sample.uid}
              className="group p-3 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-red-500/40 rounded-2xl transition-all flex items-center justify-between shadow-sm cursor-pointer"
              onClick={() => onSelectSample(sample)}
            >
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-100 group-hover:text-red-400 transition-colors">{sample.title}</h4>
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                  <span className="text-red-500 font-bold">{sample.tempoBpm} BPM</span>
                  <span>•</span>
                  <span>{sample.musicalKey}</span>
                  <span>•</span>
                  <span className="uppercase tracking-widest text-[9px] bg-slate-800 px-1.5 py-0.5 rounded">{sample.style}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); onSelectSample(sample); }}
                  className="w-8 h-8 rounded-xl bg-slate-800 group-hover:bg-red-600 text-slate-300 group-hover:text-white flex items-center justify-center transition-all shadow"
                >
                  <Play size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};