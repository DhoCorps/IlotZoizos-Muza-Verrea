// apps/hub-central/src/components/partita/KeyboardVisualizer.tsx
'use client';

import React from 'react';

interface KeyPosition {
  note: string;   // Ex: 'C', 'C#', 'D'
  octave?: number; // Optionnel (si non fourni, illumine toutes les notes correspondantes)
  label?: string; // Ex: 'R', '3m'
  color?: string; // Couleur personnalisée
}

interface KeyboardVisualizerProps {
  startOctave?: number;
  octaves?: number;
  positions?: KeyPosition[];
  title?: string;
}

export const KeyboardVisualizer: React.FC<KeyboardVisualizerProps> = ({
  startOctave = 2,
  octaves = 2,
  positions = [],
  title,
}) => {
  // Structure d'une octave (12 demi-tons)
  // isBlack détermine la couleur et le placement visuel
  const octaveStructure = [
    { note: 'C', isBlack: false },
    { note: 'C#', isBlack: true },
    { note: 'D', isBlack: false },
    { note: 'D#', isBlack: true },
    { note: 'E', isBlack: false },
    { note: 'F', isBlack: false },
    { note: 'F#', isBlack: true },
    { note: 'G', isBlack: false },
    { note: 'G#', isBlack: true },
    { note: 'A', isBlack: false },
    { note: 'A#', isBlack: true },
    { note: 'B', isBlack: false },
  ];

  // Génération du tableau complet des touches selon le nombre d'octaves
  const keys: { note: string; octave: number; isBlack: boolean }[] = [];
  for (let oct = startOctave; oct < startOctave + octaves; oct++) {
    octaveStructure.forEach(k => keys.push({ ...k, octave: oct }));
  }

  // Filtrer les touches blanches pour créer le conteneur flex
  const whiteKeys = keys.filter(k => !k.isBlack);

  return (
    <div className="w-full bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-xl overflow-x-auto custom-scrollbar">
      {title && (
        <h4 className="text-xs font-black uppercase tracking-widest text-[#E5484D] mb-6">
          {title}
        </h4>
      )}

      <div className="relative inline-flex h-40 bg-black rounded-lg border-2 border-slate-700 p-1">
        {whiteKeys.map((wk, i) => {
          // Chercher si cette touche blanche est active
          const activePos = positions.find(
            p => (p.note === wk.note) && (p.octave === undefined || p.octave === wk.octave)
          );

          // Identifier si une touche noire suit cette touche blanche (pour la superposer)
          const nextKeyInFullList = keys.find(
            k => k.octave === wk.octave && octaveStructure.findIndex(s => s.note === k.note) === octaveStructure.findIndex(s => s.note === wk.note) + 1
          );
          const hasBlackKeyAfter = nextKeyInFullList?.isBlack;

          // Chercher si cette touche noire (si elle existe) est active
          const activeBlackPos = hasBlackKeyAfter ? positions.find(
            p => (p.note === nextKeyInFullList.note) && (p.octave === undefined || p.octave === nextKeyInFullList.octave)
          ) : null;

          return (
            <div key={`${wk.note}${wk.octave}`} className="relative flex">
              
              {/* Touche Blanche */}
              <div 
                className={`w-10 h-full border border-slate-300 rounded-b-md flex flex-col justify-end pb-2 items-center transition-all ${
                  activePos ? 'bg-amber-100 shadow-[inset_0_-10px_20px_rgba(245,158,11,0.3)]' : 'bg-white hover:bg-slate-100'
                }`}
              >
                {/* Marqueur de note jouée */}
                {activePos && (
                  <div 
                    className="w-5 h-5 rounded-full flex items-center justify-center shadow-md mb-1 z-10"
                    style={{ backgroundColor: activePos.color || '#E5484D' }}
                  >
                    <span className="text-[9px] font-bold text-white">{activePos.label || wk.note}</span>
                  </div>
                )}
                {!activePos && <span className="text-[8px] font-mono text-slate-300">{wk.note}</span>}
              </div>

              {/* Touche Noire (Superposée entre deux touches blanches) */}
              {hasBlackKeyAfter && (
                <div className="absolute top-0 right-[-14px] z-20">
                  <div 
                    className={`w-7 h-24 rounded-b-sm border border-black flex flex-col justify-end pb-2 items-center transition-all shadow-md ${
                      activeBlackPos ? 'bg-amber-800' : 'bg-slate-900 hover:bg-slate-800'
                    }`}
                  >
                    {activeBlackPos && (
                      <div 
                        className="w-4 h-4 rounded-full flex items-center justify-center shadow-md z-10"
                        style={{ backgroundColor: activeBlackPos.color || '#E5484D' }}
                      >
                        <span className="text-[8px] font-bold text-white">{activeBlackPos.label || nextKeyInFullList.note}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};