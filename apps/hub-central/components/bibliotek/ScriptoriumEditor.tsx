'use client';

import React, { useState, useEffect } from 'react';

interface ScriptoriumEditorProps {
  initialTitle?: string;
  initialContent?: string;
  initialWritingType?: string;
  initialStyle?: string;
  onSave: (data: { title: string; content: string; writingType: string; style: string }) => Promise<void>;
}

// Listes riches préétablies (mais totalement extensibles)
const PREDEFINED_TYPES = ['roman', 'essai', 'biographie', 'poesie', 'manifeste', 'journal-intime', 'nouvelle'];
const PREDEFINED_STYLES = ['philosophie', 'science-fiction', 'cyberpunk', 'aventure', 'historique', 'experimental', 'poetique'];

export const ScriptoriumEditor: React.FC<ScriptoriumEditorProps> = ({
  initialTitle = '',
  initialContent = '',
  initialWritingType = 'roman',
  initialStyle = 'philosophie',
  onSave,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  
  // Gestion du type et du style (avec support de la saisie libre personnalisée)
  const [writingType, setWritingType] = useState(initialWritingType);
  const [customType, setCustomType] = useState('');
  const [isCustomTypeMode, setIsCustomTypeMode] = useState(false);

  const [style, setStyle] = useState(initialStyle);
  const [customStyle, setCustomStyle] = useState('');
  const [isCustomStyleMode, setIsCustomStyleMode] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Sauvegarde locale automatique (PWA / Résilience hors-ligne)
  useEffect(() => {
    const savedDraft = localStorage.getItem('scriptorium_draft');
    if (savedDraft && !initialContent) {
      try {
        const parsed = JSON.parse(savedDraft);
        setTitle(parsed.title || '');
        setContent(parsed.content || '');
      } catch (e) {
        console.error("Erreur de lecture du brouillon local", e);
      }
    }
  }, [initialContent]);

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('scriptorium_draft', JSON.stringify({ title, content }));
    }, 1000);
    return () => clearTimeout(timer);
  }, [title, content]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const finalType = isCustomTypeMode ? customType.trim() || 'roman' : writingType;
      const finalStyle = isCustomStyleMode ? customStyle.trim() || 'philosophie' : style;

      await onSave({ title, content, writingType: finalType, style: finalStyle });
      setLastSaved(new Date());
      localStorage.removeItem('scriptorium_draft');
    } catch (err) {
      console.error("Échec de la sédimentation du texte :", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121417] text-[#E1E4E8] p-6 md:p-12 font-serif selection:bg-[#E5484D] selection:text-white">
      <div className="max-w-4xl mx-auto">
        
        {/* En-tête de l'Atelier */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-[#2A2E39] pb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-wide text-[#F0F3F6]">Le Scriptorium</h1>
            <p className="text-xs text-[#8B949E] font-sans mt-1">Sanctuaire d'écriture souverain — Sceau SHA-256 en attente</p>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-sans text-[#8B949E]">
            {lastSaved && <span>Enregistré à {lastSaved.toLocaleTimeString()}</span>}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[#2A2E39] hover:bg-[#383F52] text-[#F0F3F6] px-5 py-2.5 rounded-lg font-medium transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {isSaving ? 'Sédimentation...' : 'Sceller l’œuvre'}
            </button>
          </div>
        </div>

        {/* Formulaire de classification ouverte */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 font-sans text-xs">
          
          {/* Type d'écrit */}
          <div className="bg-[#1A1D24] p-4 rounded-xl border border-[#2A2E39]">
            <label className="block text-[#8B949E] mb-2 font-semibold">Type d'écrit</label>
            {!isCustomTypeMode ? (
              <div className="flex gap-2">
                <select
                  value={writingType}
                  onChange={(e) => {
                    if (e.target.value === 'CUSTOM') {
                      setIsCustomTypeMode(true);
                    } else {
                      setWritingType(e.target.value);
                    }
                  }}
                  className="w-full bg-[#121417] border border-[#2A2E39] rounded-lg px-3 py-2 text-[#F0F3F6] focus:outline-none focus:border-[#E5484D]"
                >
                  {PREDEFINED_TYPES.map((t) => (
                    <option key={t} value={t}>{t.toUpperCase()}</option>
                  ))}
                  <option value="CUSTOM">✨ Autre (Libre inventé par l'Oiseau)...</option>
                </select>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: poeme-cyber-alchimique"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  className="w-full bg-[#121417] border border-[#E5484D] rounded-lg px-3 py-2 text-[#F0F3F6] focus:outline-none"
                />
                <button
                  onClick={() => setIsCustomTypeMode(false)}
                  className="text-[#8B949E] hover:text-white px-2 py-1 text-xs"
                >
                  Retour
                </button>
              </div>
            )}
          </div>

          {/* Style / Thématique */}
          <div className="bg-[#1A1D24] p-4 rounded-xl border border-[#2A2E39]">
            <label className="block text-[#8B949E] mb-2 font-semibold">Style ou Thématique</label>
            {!isCustomStyleMode ? (
              <div className="flex gap-2">
                <select
                  value={style}
                  onChange={(e) => {
                    if (e.target.value === 'CUSTOM') {
                      setIsCustomStyleMode(true);
                    } else {
                      setStyle(e.target.value);
                    }
                  }}
                  className="w-full bg-[#121417] border border-[#2A2E39] rounded-lg px-3 py-2 text-[#F0F3F6] focus:outline-none focus:border-[#E5484D]"
                >
                  {PREDEFINED_STYLES.map((s) => (
                    <option key={s} value={s}>{s.toUpperCase()}</option>
                  ))}
                  <option value="CUSTOM">✨ Autre (Style libre)...</option>
                </select>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: cyber-philosophie-sauvage"
                  value={customStyle}
                  onChange={(e) => setCustomStyle(e.target.value)}
                  className="w-full bg-[#121417] border border-[#E5484D] rounded-lg px-3 py-2 text-[#F0F3F6] focus:outline-none"
                />
                <button
                  onClick={() => setIsCustomStyleMode(false)}
                  className="text-[#8B949E] hover:text-white px-2 py-1 text-xs"
                >
                  Retour
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Zone de Rédaction Principale */}
        <div className="bg-[#1A1D24] rounded-2xl border border-[#2A2E39] p-6 md:p-10 shadow-2xl flex flex-col gap-6">
          <input
            type="text"
            placeholder="Titre de l'ouvrage ou du chapitre..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-transparent text-3xl md:text-4xl font-bold placeholder-[#484F58] text-[#F0F3F6] focus:outline-none border-b border-[#2A2E39] pb-4"
          />

          <textarea
            placeholder="Écris ta substance ici... Les mots s'écoulent en silence."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={18}
            className="w-full bg-transparent text-lg leading-relaxed placeholder-[#484F58] text-[#E1E4E8] focus:outline-none resize-none font-serif"
          />
        </div>

      </div>
    </div>
  );
};