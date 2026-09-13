'use client';

import React, { useState } from 'react';
import { Star, MessageSquarePlus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PapierAncreReaderProps {
  bookUid: string;       // Requis pour lier les annotations au livre
  title: string;
  author: string;
  content: string;
  writingType?: string;
  style?: string;
  availableFonts?: { name: string; fontFamily: string }[]; // Polices Letr'in connectées
  onProgress?: (progressPercentage: number) => void;
}

type PaletteMode = 'encre-chine' | 'crepuscule';

export const PapierAncreReader: React.FC<PapierAncreReaderProps> = ({
  bookUid,
  title,
  author,
  content,
  writingType = 'roman',
  style = 'philosophie',
  availableFonts = [],
  onProgress,
}) => {
  // États de l'expérience de lecture
  const [palette, setPalette] = useState<PaletteMode>('encre-chine');
  const [selectedFont, setSelectedFont] = useState<string>('sans-serif');
  const [fontSize, setFontSize] = useState<number>(18); // Taille de police ajustable
  const [isDeepImmersion, setIsDeepImmersion] = useState<boolean>(false);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  // 📝 États pour la prise de note contextuelle sur sélection de texte
  const [selectedText, setSelectedText] = useState<string>('');
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [isAnnotationModalOpen, setIsAnnotationModalOpen] = useState<boolean>(false);
  const [commentInput, setCommentInput] = useState<string>('');
  const [importanceLevel, setImportanceLevel] = useState<number>(1);
  const [isSubmittingNote, setIsSubmittingNote] = useState<boolean>(false);

  // Gestion du suivi de lecture
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const totalHeight = target.scrollHeight - target.clientHeight;
    if (totalHeight > 0) {
      const currentProgress = (target.scrollTop / totalHeight) * 100;
      setScrollProgress(Math.round(currentProgress));
      if (onProgress) {
        onProgress(Math.round(currentProgress));
      }
    }
  };

  // 🖱️ Détection de la sélection de texte par l'Oiseau
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      // Si on clique ailleurs sans garder de sélection, on masque le bouton flottant (sauf si la modale est ouverte)
      if (!isAnnotationModalOpen) {
        setPopupPosition(null);
      }
      return;
    }

    const text = selection.toString().trim();
    if (text.length > 3) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectedText(text);
      setPopupPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      });
    }
  };

  // 💾 Soumission de la note vers l'API
  const handleSaveAnnotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedText) return;

    setIsSubmittingNote(true);
    try {
      const res = await fetch('/api/bibliotek/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookUid,
          bookTitle: title,
          selectedText,
          comment: commentInput.trim(),
          importance: importanceLevel,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Échec de l'enregistrement de la note.");

      toast.success("✨ Passage surligné et note consignée dans le Codex !");
      setIsAnnotationModalOpen(false);
      setCommentInput('');
      setImportanceLevel(1);
      setSelectedText('');
      setPopupPosition(null);
      window.getSelection()?.removeAllRanges();
    } catch (err: any) {
      toast.error(`🚨 Erreur : ${err.message}`);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Définition des thèmes écologiques (Absence totale de bleu)
  const themeStyles = {
    'encre-chine': {
      bg: 'bg-[#181A1F]',
      text: 'text-[#C9D1D9]',
      card: 'bg-[#21262D]',
      border: 'border-[#30363D]',
      accent: 'text-[#E5484D]',
      subtle: 'text-[#8B949E]',
    },
    'crepuscule': {
      bg: 'bg-[#1C1412]',
      text: 'text-[#E6D5C3]',
      card: 'bg-[#2A1F1B]',
      border: 'border-[#3D2C27]',
      accent: 'text-[#E06D53]',
      subtle: 'text-[#A38A75]',
    },
  }[palette];

  return (
    <div className={`min-h-screen transition-colors duration-500 ${themeStyles.bg} ${themeStyles.text} flex flex-col relative`}>
      
      {/* Barre d'outils supérieure (Masquée en mode Immersion Profonde) */}
      {!isDeepImmersion && (
        <header className={`w-full ${themeStyles.card} border-b ${themeStyles.border} px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-sans shadow-md z-10`}>
          
          {/* Informations sur l'ouvrage */}
          <div>
            <h1 className="text-sm font-bold tracking-wide">{title}</h1>
            <p className={`${themeStyles.subtle} mt-0.5`}>Par {author} • <span className="uppercase">{writingType}</span> / <span className="uppercase">{style}</span></p>
          </div>

          {/* Contrôles de lecture éco-responsables */}
          <div className="flex flex-wrap items-center gap-4">
            
            {/* Bascule de Palette (Zéro Bleu) */}
            <div className={`flex rounded-lg border ${themeStyles.border} overflow-hidden p-0.5`}>
              <button
                onClick={() => setPalette('encre-chine')}
                className={`px-3 py-1.5 rounded-md transition-all ${palette === 'encre-chine' ? 'bg-[#30363D] text-white font-semibold' : themeStyles.subtle}`}
              >
                Encre de Chine
              </button>
              <button
                onClick={() => setPalette('crepuscule')}
                className={`px-3 py-1.5 rounded-md transition-all ${palette === 'crepuscule' ? 'bg-[#3D2C27] text-white font-semibold' : themeStyles.subtle}`}
              >
                Crépuscule
              </button>
            </div>

            {/* Sélecteur de Police Letr'in (si disponible) */}
            {availableFonts.length > 0 && (
              <select
                value={selectedFont}
                onChange={(e) => setSelectedFont(e.target.value)}
                className={`bg-transparent border ${themeStyles.border} rounded-lg px-2.5 py-1.5 focus:outline-none`}
              >
                <option value="sans-serif">Police Standard</option>
                {availableFonts.map((f) => (
                  <option key={f.fontFamily} value={f.fontFamily}>{f.name} (Letr'in)</option>
                ))}
              </select>
            )}

            {/* Ajustement de la taille du texte */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setFontSize((prev) => Math.max(14, prev - 2))}
                className={`px-2 py-1 rounded border ${themeStyles.border} hover:opacity-80`}
              >
                A-
              </button>
              <span>{fontSize}px</span>
              <button 
                onClick={() => setFontSize((prev) => Math.min(28, prev + 2))}
                className={`px-2 py-1 rounded border ${themeStyles.border} hover:opacity-80`}
              >
                A+
              </button>
            </div>

            {/* Bouton d'Immersion Profonde */}
            <button
              onClick={() => setIsDeepImmersion(true)}
              className="bg-[#E5484D] hover:bg-[#D43D42] text-white px-3 py-1.5 rounded-lg font-medium transition-all shadow"
            >
              Immersion Profonde 🕯️
            </button>
          </div>
        </header>
      )}

      {/* Barre de progression discrète */}
      <div className="w-full h-1 bg-transparent relative">
        <div 
          className="h-full bg-[#E5484D] transition-all duration-200" 
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Zone de lecture "Papier Ancre" avec gestion de la sélection de texte */}
      <main 
        onScroll={handleScroll}
        onMouseUp={handleMouseUp}
        className="flex-1 overflow-y-auto px-6 py-12 md:py-20 flex justify-center relative select-text"
      >
        <article 
          className="w-full max-w-2xl leading-relaxed space-y-6 transition-all duration-300"
          style={{ fontFamily: selectedFont, fontSize: `${fontSize}px` }}
        >
          {/* Bouton de sortie d'immersion flottant si activé */}
          {isDeepImmersion && (
            <button
              onClick={() => setIsDeepImmersion(false)}
              className="fixed top-6 right-6 opacity-30 hover:opacity-100 bg-[#21262D] text-white px-3 py-1.5 rounded-full text-xs font-sans transition-all z-50 shadow-lg"
            >
              Quitter l'immersion ✕
            </button>
          )}

          {/* Corps du texte rendu proprement */}
          <div className="whitespace-pre-wrap font-serif opacity-95">
            {content || "Ce manuscrit est encore silencieux..."}
          </div>
        </article>
      </main>

      {/* 📌 Bulle Flottante de Surlignage (Apparaît au surlignage de texte) */}
      {popupPosition && !isAnnotationModalOpen && (
        <div 
          className="fixed z-50 transform -translate-x-1/2 -translate-y-full mb-3"
          style={{ left: popupPosition.x, top: popupPosition.y }}
        >
          <button
            onClick={() => setIsAnnotationModalOpen(true)}
            className="bg-[#E5484D] text-white px-4 py-2 rounded-xl text-xs font-sans font-bold shadow-2xl flex items-center gap-2 hover:bg-[#D43D42] transition-all scale-105"
          >
            <MessageSquarePlus size={14} /> Prendre une note ⭐
          </button>
        </div>
      )}

      {/* 📝 Modale de Saisie de Note et d'Importance */}
      {isAnnotationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-lg bg-[#1A1D24] border border-[#30363D] rounded-3xl p-6 md:p-8 shadow-2xl relative space-y-6 font-sans">
            
            <div className="flex items-center justify-between pb-4 border-b border-[#30363D]">
              <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Star size={16} className="text-amber-400" /> Consigner une Fulgurance
              </h3>
              <button 
                onClick={() => setIsAnnotationModalOpen(false)}
                className="text-xs text-[#8B949E] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Rappel du texte sélectionné */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#8B949E] uppercase tracking-wider">Passage surligné :</label>
              <blockquote className="border-l-2 border-[#E5484D] pl-3 italic text-xs text-[#C9D1D9] bg-[#121417] p-3 rounded-r-xl max-h-24 overflow-y-auto">
                &ldquo;{selectedText}&rdquo;
              </blockquote>
            </div>

            {/* Formulaire de note */}
            <form onSubmit={handleSaveAnnotation} className="space-y-4">
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#8B949E] uppercase tracking-wider">Commentaire personnel (Optionnel) :</label>
                <textarea
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Pourquoi ce passage résonne-t-il en toi..."
                  rows={3}
                  className="w-full bg-[#121417] border border-[#30363D] rounded-xl p-3 text-xs text-white outline-none focus:border-[#E5484D] resize-none"
                />
              </div>

              {/* Sélecteur d'importance (1 à 3 étoiles) */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#8B949E] uppercase tracking-wider">Niveau d'importance :</label>
                <div className="flex items-center gap-3 bg-[#121417] p-3 rounded-xl border border-[#30363D]">
                  {[1, 2, 3].map((lvl) => (
                    <button
                      type="button"
                      key={lvl}
                      onClick={() => setImportanceLevel(lvl)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        importanceLevel >= lvl 
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' 
                          : 'bg-transparent text-[#8B949E]'
                      }`}
                    >
                      <Star size={12} fill={importanceLevel >= lvl ? 'currentColor' : 'none'} />
                      {lvl === 1 ? 'Mineure' : lvl === 2 ? 'Notable' : 'Vitale'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAnnotationModalOpen(false)}
                  className="px-4 py-2 bg-transparent text-[#8B949E] hover:text-white text-xs font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNote}
                  className="px-6 py-2.5 bg-[#E5484D] hover:bg-[#D43D42] text-white font-black uppercase text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingNote ? <Loader2 size={14} className="animate-spin" /> : 'Sceller la note'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Pied de page liseuse (Masqué en immersion) */}
      {!isDeepImmersion && (
        <footer className={`w-full py-4 text-center text-xs font-sans ${themeStyles.subtle} border-t ${themeStyles.border}`}>
          <span>Progression de lecture : {scrollProgress}% • Sanctuaire Bibliotek (Zéro émission bleue)</span>
        </footer>
      )}

    </div>
  );
};