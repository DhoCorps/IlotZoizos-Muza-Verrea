// apps/hub-central/components/poetrik/PoetrikCanvas.tsx

'use client';

import React, { useState, useMemo } from 'react';

interface PoetrikCanvasProps {
  initialContent?: string;
  onContentChange?: (content: string) => void;
  onWordSelect?: (word: string) => void;
}

export const PoetrikCanvas: React.FC<PoetrikCanvasProps> = ({
  initialContent = '',
  onContentChange,
  onWordSelect,
}) => {
  const [text, setText] = useState<string>(initialContent);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  // Découpage du texte en vers (lignes) pour l'analyse des syllabes
  const lines = useMemo(() => text.split('\n'), [text]);

  // Estimation basique du nombre de syllabes par vers pour le retour visuel
  // (Sera enrichi dynamiquement par l'Oracle Lexical et l'IPA)
  const calculateLineSyllables = (line: string): number => {
    const cleanWords = line.trim().split(/\s+/).filter(Boolean);
    return cleanWords.length * 2; // Approximation visuelle en attendant l'IPA strict
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    if (onContentChange) {
      onContentChange(newText);
    }
  };

  const handleWordClick = (word: string) => {
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
            🪶 Atelier Poetrik <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">Actif</span>
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
          <span>Standard IPA Universel</span>
        </div>
      </div>

      {/* Panneau de scansion et rétroaction visuelle en temps réel */}
      <div className="w-full lg:w-80 bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-slate-300 border-b border-slate-800 pb-2">
          📊 Scansion & Rythme des Vers
        </h3>

        <div className="flex flex-col gap-3 overflow-y-auto max-h-96 pr-1">
          {lines.map((line, idx) => {
            if (!line.trim()) return null;
            const syllableEst = calculateLineSyllables(line);
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
                  <span className="text-slate-500">Pieds estimés :</span>
                  <span className={`px-2 py-0.5 rounded font-mono font-bold ${
                    isAlexandrin 
                      ? 'bg-amber-950 text-amber-400 border border-amber-800' 
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    {syllableEst} {isAlexandrin && '✨'}
                  </span>
                </div>

                {/* Mots cliquables pour l'Oracle */}
                <div className="flex flex-wrap gap-1 mt-1 pt-2 border-t border-slate-900">
                  {line.split(/\s+/).map((w, wIdx) => (
                    <button
                      key={wIdx}
                      onClick={() => handleWordClick(w)}
                      className="text-xs px-1.5 py-0.5 bg-slate-800/60 hover:bg-emerald-950 hover:text-emerald-300 rounded text-slate-300 transition-colors"
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
              Le silence emplit la page. Commence à composer pour voir la scansion s'illuminer.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};