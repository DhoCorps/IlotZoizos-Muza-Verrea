// apps/hub-central/components/poetrik/PoetrikToolbar.tsx

'use client';

import React from 'react';

interface PoetrikToolbarProps {
  currentLanguage: string;
  onLanguageChange: (lang: string) => void;
  activeView: 'canvas' | 'graph';
  onViewChange: (view: 'canvas' | 'graph') => void;
  onSave?: () => void;
  isSaving?: boolean;
}

export const PoetrikToolbar: React.FC<PoetrikToolbarProps> = ({
  currentLanguage,
  onLanguageChange,
  activeView,
  onViewChange,
  onSave,
  isSaving = false,
}) => {
  // Langues supportées : socle principal + extension infinie pour les mondes de fiction
  const languages = [
    { code: 'fr', label: 'Français' },
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'sjn', label: 'Sindarin (Elfique)' },
    { code: 'qya', label: 'Quenya' },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 mb-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-xl">
      {/* Sélecteur de Langue / Monde */}
      <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
        <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Langue :</span>
        <div className="flex gap-1">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => onLanguageChange(lang.code)}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-all whitespace-nowrap ${
                currentLanguage === lang.code
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700 shadow-sm'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bascule de Vues (Atelier d'écriture / Observatoire Sémantique) */}
      <div className="flex items-center gap-2 bg-slate-950 p-1 border border-slate-800 rounded-lg">
        <button
          onClick={() => onViewChange('canvas')}
          className={`text-xs px-3 py-1.5 rounded-md transition-all ${
            activeView === 'canvas'
              ? 'bg-slate-800 text-slate-100 font-medium shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          🪶 Atelier d&apos;Écriture
        </button>
        <button
          onClick={() => onViewChange('graph')}
          className={`text-xs px-3 py-1.5 rounded-md transition-all ${
            activeView === 'graph'
              ? 'bg-slate-800 text-slate-100 font-medium shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          🌌 Observatoire Graphe
        </button>
      </div>

      {/* Bouton d'action / Sédimentation */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
        <div className="hidden md:flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-950/60 px-2 py-1 rounded border border-slate-800/60" title="Pacte de Filiation actif : respect des sources et des flux">
          <span>📜 Pacte de Filiation</span>
        </div>

        {onSave && (
          <button
            onClick={onSave}
            disabled={isSaving}
            className="text-xs px-4 py-2 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white font-medium rounded-lg shadow transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {isSaving ? 'Sédimentation...' : 'Sceller le Poème ✨'}
          </button>
        )}
      </div>
    </div>
  );
};