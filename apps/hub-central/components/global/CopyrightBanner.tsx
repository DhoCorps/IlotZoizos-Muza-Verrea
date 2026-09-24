'use client';

import React from 'react';
import { CopyrightMetadata, CopyrightRole } from '@ilot/types';

interface CopyrightBannerProps {
  mode: 'edit' | 'display';
  metadata?: CopyrightMetadata;
  onChange?: (metadata: CopyrightMetadata) => void;
  className?: string;
}

const ROLE_DESCRIPTIONS = {
  CREATOR: "Vous êtes le créateur original de cette œuvre.",
  SUBLIMATOR: "Vous avez modifié, amélioré ou traduit une œuvre existante.",
  CURATOR: "Vous relayez ou archivez une œuvre (Exclusivité Îlot impossible)."
};

export function CopyrightBanner({ mode, metadata, onChange, className = '' }: CopyrightBannerProps) {
  const currentMeta: CopyrightMetadata = metadata || { role: 'CREATOR', isExclusiveIlot: false };

  // 🛡️ Gestionnaire de changement pour le mode 'edit'
  const handleChange = (field: keyof CopyrightMetadata, value: any) => {
    if (!onChange) return;
    
    const updatedMeta = { ...currentMeta, [field]: value };
    
    // Règle métier stricte (UX) : Forcer isExclusiveIlot à false si CURATOR
    if (field === 'role' && value === 'CURATOR') {
      updatedMeta.isExclusiveIlot = false;
    }
    
    onChange(updatedMeta);
  };

  // ==========================================
  // 👁️ MODE AFFICHAGE (DISPLAY) - Pour les pages publiques
  // ==========================================
  if (mode === 'display') {
    return (
      <aside 
        aria-label="Informations de droit d'auteur"
        className={`flex flex-col gap-2 p-4 rounded-lg border ${
          currentMeta.isExclusiveIlot ? 'bg-amber-900/10 border-amber-500/50' : 'bg-slate-800/50 border-slate-700'
        } ${className}`}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">
            {currentMeta.role === 'CREATOR' && '🎨 Œuvre Originale'}
            {currentMeta.role === 'SUBLIMATOR' && '✨ Œuvre Sublimée'}
            {currentMeta.role === 'CURATOR' && '📚 Curation / Archive'}
          </span>
          {currentMeta.isExclusiveIlot && (
            <span className="px-2 py-1 text-xs font-bold text-amber-400 bg-amber-950/50 rounded-full ring-1 ring-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
              ✨ Exclusivité Îlot
            </span>
          )}
        </div>
        
        {currentMeta.role !== 'CREATOR' && currentMeta.originalAuthor && (
          <p className="text-xs text-slate-400 mt-1">
            D'après l'œuvre originale de <strong className="text-slate-300">{currentMeta.originalAuthor}</strong>
            {currentMeta.originalWorkTitle && ` (« ${currentMeta.originalWorkTitle} »)`}.
          </p>
        )}
        
        {currentMeta.role === 'SUBLIMATOR' && currentMeta.sublimationNotes && (
          <p className="text-xs italic text-slate-500 mt-2 border-l-2 border-slate-600 pl-2">
            Notes du sublimateur : {currentMeta.sublimationNotes}
          </p>
        )}
      </aside>
    );
  }

  // ==========================================
  // ✍️ MODE ÉDITION (EDIT) - Pour les formulaires
  // ==========================================
  return (
    <fieldset className={`p-4 rounded-lg border border-slate-700 bg-slate-900 ${className}`}>
      <legend className="px-2 text-sm font-semibold text-slate-300">Droits & Origines (Copyright)</legend>
      
      <div className="flex flex-col gap-4 mt-2">
        {/* SÉLECTEUR DE RÔLE */}
        <div>
          <label htmlFor="copyright-role" className="block text-xs font-medium text-slate-400 mb-1">
            Votre rôle dans cette œuvre
          </label>
          <select
            id="copyright-role"
            value={currentMeta.role}
            onChange={(e) => handleChange('role', e.target.value as CopyrightRole)}
            className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="CREATOR">Créateur Original</option>
            <option value="SUBLIMATOR">Sublimateur (Traducteur, Arrangeur, etc.)</option>
            <option value="CURATOR">Curateur (Relayeur, Archiviste)</option>
          </select>
          <p className="text-xs text-slate-500 mt-1">{ROLE_DESCRIPTIONS[currentMeta.role]}</p>
        </div>

        {/* CHAMPS CONDITIONNELS (SUBLIMATOR & CURATOR) */}
        {currentMeta.role !== 'CREATOR' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-slate-800/50 rounded border border-slate-700/50">
            <div>
              <label htmlFor="original-author" className="block text-xs font-medium text-slate-400 mb-1">
                Auteur Original (Optionnel)
              </label>
              <input
                id="original-author"
                type="text"
                placeholder="Ex: H.P. Lovecraft"
                value={currentMeta.originalAuthor || ''}
                onChange={(e) => handleChange('originalAuthor', e.target.value)}
                className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label htmlFor="original-title" className="block text-xs font-medium text-slate-400 mb-1">
                Titre Original (Optionnel)
              </label>
              <input
                id="original-title"
                type="text"
                placeholder="Ex: The Call of Cthulhu"
                value={currentMeta.originalWorkTitle || ''}
                onChange={(e) => handleChange('originalWorkTitle', e.target.value)}
                className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            {currentMeta.role === 'SUBLIMATOR' && (
              <div className="md:col-span-2">
                <label htmlFor="sublimation-notes" className="block text-xs font-medium text-slate-400 mb-1">
                  Notes de sublimation (Optionnel)
                </label>
                <textarea
                  id="sublimation-notes"
                  rows={2}
                  placeholder="Qu'avez-vous modifié ? (Ex: Traduction française et remasterisation audio)"
                  value={currentMeta.sublimationNotes || ''}
                  onChange={(e) => handleChange('sublimationNotes', e.target.value)}
                  className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
            )}
          </div>
        )}

        {/* CHECKBOX EXCLUSIVITÉ ÎLOT */}
        <div className="flex items-center gap-3 mt-2">
          <input
            id="exclusive-ilot"
            type="checkbox"
            checked={currentMeta.isExclusiveIlot || false}
            disabled={currentMeta.role === 'CURATOR'}
            onChange={(e) => handleChange('isExclusiveIlot', e.target.checked)}
            className="w-4 h-4 text-amber-500 bg-slate-800 border-slate-600 rounded focus:ring-amber-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <label 
            htmlFor="exclusive-ilot" 
            className={`text-sm font-medium ${currentMeta.role === 'CURATOR' ? 'text-slate-600' : 'text-slate-300'}`}
          >
            Déclarer cette œuvre comme Exclusivité Îlot Zoizos ✨
          </label>
        </div>
      </div>
    </fieldset>
  );
}