// apps/hub-central/components/poetrik/PoetrikCanvas.tsx

'use client';

import React, { useState, useMemo } from 'react';
import { SyllableEngine } from '@ilot/shared-core';

interface PoetrikCanvasProps {
  initialContent?: string;
  onContentChange?: (content: string) => void;
  onWordSelect?: (word: string) => void;
}

// Motif de hauteurs pour l'onde visuelle (pseudo-aléatoire mais stable pour éviter les sauts au rendu)
const WAVE_PATTERN = [40, 75, 45, 90, 35, 65, 80, 50, 95, 30, 85, 55];

export const PoetrikCanvas: React.FC<PoetrikCanvasProps> = ({
  initialContent = '',
  onContentChange,
  onWordSelect,
}) => {
  const [text, setText] = useState<string>(initialContent);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  const lines = useMemo(() => text.split('\n'), [text]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    if (onContentChange) {
      onContentChange(newText);
    }
  };

  const handleWordClick = (word: string) => {
    // Nettoyage de la ponctuation pour l'Oracle
    const cleanWord = word.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '');
    setSelectedWord(cleanWord);
    if (onWordSelect && cleanWord) {
      onWordSelect(cleanWord);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl mx-auto p-4">
      {/* Canevas d'écriture principal */}
      <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800 text-slate-400 text-sm">
          <span className="flex items-center gap-2 font-medium text-slate-300">
            🪶 Atelier Poetrik <span className="text-xs px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800">Actif</span>
          </span>
          <span>{text.length} caractères</span>
        </div>

        <textarea
          value={text}
          onChange={handleChange}
          placeholder="Écris ton vers ici... Laisse résonner les syllabes..."
          className="w-full h-96 p-6 bg-transparent text-slate-100 placeholder-slate-600 resize-none focus:outline-none font-serif text-lg leading-relaxed"
        />

        <div className="px-4 py-2 bg-slate-950/50 border-t border-slate-800/50 text-xs text-slate-500 flex justify-between">
          <span>Clique sur un mot pour invoquer l'Oracle Lexical</span>
          <span>Moteur Syllabique Quantique</span>
        </div>
      </div>

      {/* Panneau de scansion et rétroaction visuelle en temps réel */}
      <div className="w-full lg:w-80 bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-slate-300 border-b border-slate-800 pb-2">
          📊 Scansion & Écogramme Rythmique
        </h3>

        <div className="flex flex-col gap-3 overflow-y-auto max-h-96 pr-1">
          {lines.map((line, idx) => {
            if (!line.trim()) return null;
            
            // 🚀 Appel au vrai Moteur Quantique de Syllabes
            const syllableEst = SyllableEngine.countPieds(line);
            const isAlexandrin = syllableEst === 12;

            return (
              <div 
                key={idx} 
                className="p-3 bg-slate-950/80 border border-slate-800/60 rounded-lg flex flex-col gap-2"
              >
                <div className="text-xs text-slate-300 font-serif italic truncate">
                  &ldquo;{line}&rdquo;
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Pieds :</span>
                  <span className={`px-2 py-0.5 rounded font-mono font-bold ${
                    isAlexandrin 
                      ? 'bg-red-950 text-red-400 border border-red-800' 
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    {syllableEst} {isAlexandrin && '✨'}
                  </span>
                </div>

                {/* L'Écogramme Rythmique (Onde Visuelle) */}
                <div className="flex items-end gap-[2px] h-6 mt-1 border-b border-slate-800/50 pb-1" data-testid="ecogramme">
                  {Array.from({ length: Math.min(syllableEst, 24) }).map((_, i) => {
                    const height = WAVE_PATTERN[i % WAVE_PATTERN.length];
                    return (
                      <div
                        key={i}
                        className={`w-1.5 rounded-t-sm transition-all duration-300 ${
                           isAlexandrin ? 'bg-red-500/80' : 'bg-slate-500/80'
                        }`}
                        style={{ 
                          height: `${height}%`,
                          animation: `pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
                          animationDelay: `${i * 100}ms`
                        }}
                      />
                    );
                  })}
                </div>

                {/* Mots cliquables pour l'Oracle */}
                <div className="flex flex-wrap gap-1 mt-1 pt-2 border-t border-slate-900">
                  {line.split(/\s+/).map((w, wIdx) => (
                    <button
                      key={wIdx}
                      onClick={() => handleWordClick(w)}
                      className="text-xs px-1.5 py-0.5 bg-slate-800/60 hover:bg-red-950 hover:text-red-300 rounded text-slate-300 transition-colors"
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {lines.every(l => !l.trim()) && (
            <div className="text-xs text-slate-600 text-center py-8 italic">
              Le silence emplit la page. Commence à composer pour voir l'écogramme s'illuminer.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};