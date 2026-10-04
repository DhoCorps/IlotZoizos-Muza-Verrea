// apps/hub-central/components/poetrik/PoetrikToolbar.tsx
'use client';

import React, { useState } from 'react';

export interface PoetrikToolbarProps {
  currentLanguage: string;
  onLanguageChange: (lang: string) => void;
  activeView: 'canvas' | 'graph';
  onViewChange: (view: 'canvas' | 'graph') => void;
  onSave?: () => void;
  isSaving?: boolean;
  
  // 🪶 Nouveaux paramètres du Sanctuaire
  theme?: string;
  onThemeChange?: (theme: string) => void;
  catharsisVeil?: boolean;
  onCatharsisChange?: (active: boolean) => void;
  filiationPact?: boolean;
  onFiliationChange?: (active: boolean) => void;
  seoData?: { metaTitle: string; metaDescription: string };
  onSeoChange?: (seo: { metaTitle: string; metaDescription: string }) => void;
}

export const PoetrikToolbar: React.FC<PoetrikToolbarProps> = ({
  currentLanguage,
  onLanguageChange,
  activeView,
  onViewChange,
  onSave,
  isSaving = false,
  theme = 'night',
  onThemeChange,
  catharsisVeil = false,
  onCatharsisChange,
  filiationPact = true,
  onFiliationChange,
  seoData = { metaTitle: '', metaDescription: '' },
  onSeoChange,
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const languages = [
    { code: 'fr', label: 'Français' },
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'sjn', label: 'Sindarin' },
  ];

  const themes = [
    { code: 'paper', label: '📜 Papier Ancien' },
    { code: 'night', label: '🌌 Nuit Étoilée' },
    { code: 'cyber', label: '⚡ Encre Cyberpunk' },
  ];

  const handleSeoChange = (field: 'metaTitle' | 'metaDescription', value: string) => {
    if (onSeoChange) {
      onSeoChange({ ...seoData, [field]: value });
    }
  };

  return (
    <div className="relative w-full max-w-6xl mx-auto px-4 mb-4 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-xl">
      
      {/* 1. Sélecteur de Langue */}
      <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
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

      {/* 2. Bascule de Vues */}
      <div className="flex items-center gap-2 bg-slate-950 p-1 border border-slate-800 rounded-lg">
        <button
          onClick={() => onViewChange('canvas')}
          className={`text-xs px-3 py-1.5 rounded-md transition-all ${
            activeView === 'canvas'
              ? 'bg-slate-800 text-slate-100 font-medium shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          🪶 Atelier
        </button>
        <button
          onClick={() => onViewChange('graph')}
          className={`text-xs px-3 py-1.5 rounded-md transition-all ${
            activeView === 'graph'
              ? 'bg-slate-800 text-slate-100 font-medium shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          🌌 Graphe
        </button>
      </div>

      {/* 3. Sélecteur de Thème & Paramètres */}
      <div className="flex items-center gap-3 w-full md:w-auto justify-end">
        {onThemeChange && (
          <select
            value={theme}
            onChange={(e) => onThemeChange(e.target.value)}
            className="text-xs bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-emerald-700 cursor-pointer"
            data-testid="theme-selector"
          >
            {themes.map((t) => (
              <option key={t.code} value={t.code}>{t.label}</option>
            ))}
          </select>
        )}

        <button
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
            isSettingsOpen 
              ? 'bg-indigo-950 text-indigo-300 border-indigo-700' 
              : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
          }`}
          data-testid="settings-toggle"
        >
          ⚙️ Sceau & SEO
        </button>

        {onSave && (
          <button
            onClick={onSave}
            disabled={isSaving}
            className="text-xs px-4 py-2 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white font-medium rounded-lg shadow transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {isSaving ? 'Sédimentation...' : 'Sceller ✨'}
          </button>
        )}
      </div>

      {/* 4. Modale Flottante de Paramètres (SEO & Catharsis) */}
      {isSettingsOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 z-50 flex flex-col gap-4" data-testid="settings-modal">
          
          <div className="flex flex-col gap-2 border-b border-slate-800 pb-3">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">SEO & Indexation</h4>
            <input
              type="text"
              placeholder="Meta Title (60 caractères max)"
              value={seoData.metaTitle}
              onChange={(e) => handleSeoChange('metaTitle', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              maxLength={60}
            />
            <textarea
              placeholder="Meta Description (160 caractères max)"
              value={seoData.metaDescription}
              onChange={(e) => handleSeoChange('metaDescription', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none h-20"
              maxLength={160}
            />
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Sceau & Protections</h4>
            
            <label className="flex items-center justify-between cursor-pointer group">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-200 group-hover:text-indigo-300 transition-colors">Voile de Catharsis 🛡️</span>
                <span className="text-[10px] text-slate-500">Désactive les commentaires (Sanctuaire)</span>
              </div>
              <input
                type="checkbox"
                checked={catharsisVeil}
                onChange={(e) => onCatharsisChange && onCatharsisChange(e.target.checked)}
                className="w-4 h-4 accent-indigo-600 rounded bg-slate-950 border-slate-800"
                data-testid="catharsis-checkbox"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer group">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-200 group-hover:text-emerald-300 transition-colors">Pacte de Filiation 📜</span>
                <span className="text-[10px] text-slate-500">Signature cryptographique SHA-256</span>
              </div>
              <input
                type="checkbox"
                checked={filiationPact}
                onChange={(e) => onFiliationChange && onFiliationChange(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 rounded bg-slate-950 border-slate-800"
                data-testid="filiation-checkbox"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
};