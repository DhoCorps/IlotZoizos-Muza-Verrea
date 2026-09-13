// apps/hub-central/src/components/partita/FretboardVisualizer.tsx
'use client';

import React from 'react';

interface FretPosition {
  string: number; // 1 = corde la plus aiguë (en bas visuellement), 6 = corde la plus grave (en haut)
  fret: number;   // 0 = corde à vide, 1-24 = cases
  label?: string; // Ex: 'R' (Root), '3m', '5P', ou le nom de la note 'C'
  color?: string; // Ex: '#E5484D' pour la tonique
}

interface FretboardVisualizerProps {
  strings?: number;      // 4 pour Basse, 6 pour Guitare
  frets?: number;        // Nombre de cases à afficher (ex: 12 ou 15)
  tuning?: string[];     // Ex: ['E', 'A', 'D', 'G', 'B', 'E'] (de la plus grave à la plus aiguë)
  positions?: FretPosition[]; // Les points à afficher sur le manche
  title?: string;
}

export const FretboardVisualizer: React.FC<FretboardVisualizerProps> = ({
  strings = 6,
  frets = 15,
  tuning = ['E', 'A', 'D', 'G', 'B', 'E'],
  positions = [],
  title,
}) => {
  // Les repères classiques sur le manche de guitare (dots)
  const dotFrets = [3, 5, 7, 9, 15, 17, 19, 21];
  const doubleDotFrets = [12, 24];

  // Le tableau 'tuning' est souvent donné de la corde grave (6ème) à aiguë (1ère).
  // Visuellement, on affiche la corde aiguë en HAUT (index 0 visuel) ou en BAS.
  // Standard : Corde grave en bas (comme quand on regarde sa guitare par-dessus).
  const visualStrings = Array.from({ length: strings }).map((_, i) => i + 1).reverse(); // Ex pour 6: [6, 5, 4, 3, 2, 1]

  return (
    <div className="w-full bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
      {title && (
        <h4 className="text-xs font-black uppercase tracking-widest text-[#E5484D] mb-6">
          {title}
        </h4>
      )}

      <div className="relative w-full overflow-x-auto custom-scrollbar pb-4">
        {/* Conteneur principal du manche */}
        <div className="relative min-w-[800px] flex">
          
          {/* Sillet (Nut) */}
          <div className="w-6 shrink-0 flex flex-col justify-between py-2 border-r-8 border-slate-300 bg-slate-900 z-10">
            {visualStrings.map((stringNum, i) => (
              <div key={`nut-${stringNum}`} className="h-6 flex items-center justify-center">
                {/* Points pour les cordes à vide (Fret 0) */}
                {positions.some(p => p.string === stringNum && p.fret === 0) ? (
                  <div className="w-4 h-4 rounded-full bg-emerald-500 border border-emerald-300 flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                    <span className="text-[8px] font-bold text-slate-950">
                      {positions.find(p => p.string === stringNum && p.fret === 0)?.label || 'O'}
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] font-mono text-slate-500 font-bold pr-2">{tuning[i]}</span>
                )}
              </div>
            ))}
          </div>

          {/* Les Cases (Frets) */}
          <div className="flex-1 flex">
            {Array.from({ length: frets }).map((_, fretIndex) => {
              const currentFret = fretIndex + 1;
              const isDot = dotFrets.includes(currentFret);
              const isDoubleDot = doubleDotFrets.includes(currentFret);

              return (
                <div key={`fret-${currentFret}`} className="relative flex-1 flex flex-col justify-between py-2 border-r-2 border-slate-600 bg-slate-800/50">
                  
                  {/* Numéro de case en bas */}
                  <div className="absolute -bottom-5 left-0 right-0 text-center text-[9px] font-mono text-slate-600">
                    {currentFret}
                  </div>

                  {/* Incrustations (Inlays / Dots) */}
                  {isDot && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-3 h-3 rounded-full bg-slate-600/50" />
                    </div>
                  )}
                  {isDoubleDot && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 pointer-events-none">
                      <div className="w-3 h-3 rounded-full bg-slate-500/50" />
                      <div className="w-3 h-3 rounded-full bg-slate-500/50" />
                    </div>
                  )}

                  {/* Les cordes sur cette case */}
                  {visualStrings.map((stringNum) => {
                    const position = positions.find(p => p.string === stringNum && p.fret === currentFret);
                    // Épaisseur visuelle de la corde (plus grave = plus épaisse)
                    const stringThickness = stringNum === 6 ? 'h-1.5' : stringNum === 5 ? 'h-1' : stringNum <= 2 ? 'h-[1px]' : 'h-0.5';

                    return (
                      <div key={`pos-${stringNum}-${currentFret}`} className="relative h-6 flex items-center justify-center group">
                        {/* La ligne de la corde */}
                        <div className={`absolute left-0 right-0 ${stringThickness} bg-slate-500/60 pointer-events-none shadow-sm`} />
                        
                        {/* Le point (Note jouée) */}
                        {position && (
                          <div 
                            className="relative z-10 w-5 h-5 rounded-full flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110"
                            style={{ backgroundColor: position.color || '#3B82F6', border: '1px solid rgba(255,255,255,0.2)' }}
                          >
                            <span className="text-[9px] font-bold text-white drop-shadow-md">
                              {position.label}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};