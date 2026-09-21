'use client';

import React, { useState, useMemo } from 'react';
import { Star, MessageSquarePlus, X, Loader2, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { FollowButton } from '@/components/resonance/FollowButton';
import { OmniActionWidget } from '@/components/widget/OmniActionWidget';
import { IUniversalMediaItem } from '@ilot/types';

interface PapierAncreReaderProps {
  bookUid: string;       // Requis pour lier les annotations au livre
  title: string;
  author: string;
  authorUid: string;     // Requis pour l'abonnement et le widget
  content: string;
  writingType?: string;
  style?: string;
  coverUrl?: string;     // Pour la miniature du widget de partage
  createdAt?: string;    // Pour les métadonnées du widget
  availableFonts?: { name: string; fontFamily: string }[];
  onProgress?: (progressPercentage: number) => void;
}

type PaletteMode = 'encre-chine' | 'crepuscule';

export const PapierAncreReader: React.FC<PapierAncreReaderProps> = ({
  bookUid,
  title,
  author,
  authorUid,
  content,
  writingType = 'roman',
  style = 'philosophie',
  coverUrl,
  createdAt,
  availableFonts = [],
  onProgress,
}) => {
  const [palette, setPalette] = useState<PaletteMode>('encre-chine');
  const [selectedFont, setSelectedFont] = useState<string>('sans-serif');
  const [fontSize, setFontSize] = useState<number>(18);
  const [isDeepImmersion, setIsDeepImmersion] = useState<boolean>(false);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  const [isWidgetOpen, setWidgetOpen] = useState<boolean>(false);

  const [selectedText, setSelectedText] = useState<string>('');
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [isAnnotationModalOpen, setIsAnnotationModalOpen] = useState<boolean>(false);
  const [commentInput, setCommentInput] = useState<string>('');
  const [importanceLevel, setImportanceLevel] = useState<number>(1);
  const [isSubmittingNote, setIsSubmittingNote] = useState<boolean>(false);

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

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
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

  const handleSaveAnnotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedText) return;

    setIsSubmittingNote(true);
    try {
      const res = await fetch(`/api/bibliotek/${bookUid}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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

  const universalMediaItem: IUniversalMediaItem = useMemo(() => ({
    mediaId: bookUid,
    sourceApp: 'BIBLIOTEK', // 🛠️ CORRECTION : Retour de 'BIBLIOTEK' tel qu'attendu par UniversalMediaType
    ownerUid: authorUid,
    ownerSlug: author,
    title: title,
    mediaUrl: coverUrl || '',
    thumbnailUrl: coverUrl,
    createdAt: createdAt ? new Date(createdAt) : new Date(),
    consentForShowcase: false,
    consentForMusicSync: false,
  }), [bookUid, authorUid, author, title, coverUrl, createdAt]);

  return (
    <div className={`min-h-screen transition-colors duration-500 ${themeStyles.bg} ${themeStyles.text} flex flex-col relative`}>
      
      {!isDeepImmersion && (
        <header className={`w-full ${themeStyles.card} border-b ${themeStyles.border} px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-sans shadow-md z-10`}>
          
          <div className="flex flex-col gap-1">
            <h1 className="text-sm font-bold tracking-wide">{title}</h1>
            <div className={`flex items-center gap-2 ${themeStyles.subtle}`}>
              <span>Par {author}</span>
              {/* 🛠️ Le targetType="USER" est bien là pour le composant FollowButton */}
              {authorUid && <FollowButton targetUid={authorUid} targetType="USER" />}
              <span>• <span className="uppercase">{writingType}</span> / <span className="uppercase">{style}</span></span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className={`flex rounded-lg border ${themeStyles.border} overflow-hidden p-0.5`}>
              <button onClick={() => setPalette('encre-chine')} className={`px-3 py-1.5 rounded-md transition-all ${palette === 'encre-chine' ? 'bg-[#30363D] text-white font-semibold' : themeStyles.subtle}`}>Encre de Chine</button>
              <button onClick={() => setPalette('crepuscule')} className={`px-3 py-1.5 rounded-md transition-all ${palette === 'crepuscule' ? 'bg-[#3D2C27] text-white font-semibold' : themeStyles.subtle}`}>Crépuscule</button>
            </div>

            {availableFonts.length > 0 && (
              <select value={selectedFont} onChange={(e) => setSelectedFont(e.target.value)} className={`bg-transparent border ${themeStyles.border} rounded-lg px-2.5 py-1.5 focus:outline-none`}>
                <option value="sans-serif">Police Standard</option>
                {availableFonts.map((f) => <option key={f.fontFamily} value={f.fontFamily}>{f.name} (Letr'in)</option>)}
              </select>
            )}

            <div className="flex items-center gap-2">
              <button onClick={() => setFontSize((prev) => Math.max(14, prev - 2))} className={`px-2 py-1 rounded border ${themeStyles.border} hover:opacity-80`}>A-</button>
              <span>{fontSize}px</span>
              <button onClick={() => setFontSize((prev) => Math.min(28, prev + 2))} className={`px-2 py-1 rounded border ${themeStyles.border} hover:opacity-80`}>A+</button>
            </div>

            <button onClick={() => setWidgetOpen(true)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${themeStyles.border} hover:bg-white/5 transition-all`}>
              <Share2 size={14} /> Actions
            </button>

            <button onClick={() => setIsDeepImmersion(true)} className="bg-[#E5484D] hover:bg-[#D43D42] text-white px-3 py-1.5 rounded-lg font-medium transition-all shadow">
              Immersion Profonde 🕯️
            </button>
          </div>
        </header>
      )}

      <div className="w-full h-1 bg-transparent relative">
        <div className="h-full bg-[#E5484D] transition-all duration-200" style={{ width: `${scrollProgress}%` }} />
      </div>

      <main onScroll={handleScroll} onMouseUp={handleMouseUp} className="flex-1 overflow-y-auto px-6 py-12 md:py-20 flex justify-center relative select-text">
        <article className="w-full max-w-2xl leading-relaxed space-y-6 transition-all duration-300" style={{ fontFamily: selectedFont, fontSize: `${fontSize}px` }}>
          {isDeepImmersion && (
            <button onClick={() => setIsDeepImmersion(false)} className="fixed top-6 right-6 opacity-30 hover:opacity-100 bg-[#21262D] text-white px-3 py-1.5 rounded-full text-xs font-sans transition-all z-50 shadow-lg">Quitter l'immersion ✕</button>
          )}
          <div className="whitespace-pre-wrap font-serif opacity-95">{content || "Ce manuscrit est encore silencieux..."}</div>
        </article>
      </main>

      {popupPosition && !isAnnotationModalOpen && (
        <div className="fixed z-50 transform -translate-x-1/2 -translate-y-full mb-3" style={{ left: popupPosition.x, top: popupPosition.y }}>
          <button onClick={() => setIsAnnotationModalOpen(true)} className="bg-[#E5484D] text-white px-4 py-2 rounded-xl text-xs font-sans font-bold shadow-2xl flex items-center gap-2 hover:bg-[#D43D42] transition-all scale-105">
            <MessageSquarePlus size={14} /> Prendre une note ⭐
          </button>
        </div>
      )}

      {isAnnotationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-lg bg-[#1A1D24] border border-[#30363D] rounded-3xl p-6 md:p-8 shadow-2xl relative space-y-6 font-sans">
            <div className="flex items-center justify-between pb-4 border-b border-[#30363D]">
              <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2"><Star size={16} className="text-amber-400" /> Consigner une Fulgurance</h3>
              <button onClick={() => setIsAnnotationModalOpen(false)} className="text-xs text-[#8B949E] hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#8B949E] uppercase tracking-wider">Passage surligné :</label>
              <blockquote className="border-l-2 border-[#E5484D] pl-3 italic text-xs text-[#C9D1D9] bg-[#121417] p-3 rounded-r-xl max-h-24 overflow-y-auto">&ldquo;{selectedText}&rdquo;</blockquote>
            </div>
            <form onSubmit={handleSaveAnnotation} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#8B949E] uppercase tracking-wider">Commentaire personnel (Optionnel) :</label>
                <textarea value={commentInput} onChange={(e) => setCommentInput(e.target.value)} placeholder="Pourquoi ce passage résonne-t-il en toi..." rows={3} className="w-full bg-[#121417] border border-[#30363D] rounded-xl p-3 text-xs text-white outline-none focus:border-[#E5484D] resize-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#8B949E] uppercase tracking-wider">Niveau d'importance :</label>
                <div className="flex items-center gap-3 bg-[#121417] p-3 rounded-xl border border-[#30363D]">
                  {[1, 2, 3].map((lvl) => (
                    <button type="button" key={lvl} onClick={() => setImportanceLevel(lvl)} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${importanceLevel >= lvl ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-transparent text-[#8B949E]'}`}>
                      <Star size={12} fill={importanceLevel >= lvl ? 'currentColor' : 'none'} />
                      {lvl === 1 ? 'Mineure' : lvl === 2 ? 'Notable' : 'Vitale'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsAnnotationModalOpen(false)} className="px-4 py-2 bg-transparent text-[#8B949E] hover:text-white text-xs font-medium">Annuler</button>
                <button type="submit" disabled={isSubmittingNote} className="px-6 py-2.5 bg-[#E5484D] hover:bg-[#D43D42] text-white font-black uppercase text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50">
                  {isSubmittingNote ? <Loader2 size={14} className="animate-spin" /> : 'Sceller la note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <OmniActionWidget 
        media={universalMediaItem}
        isOpen={isWidgetOpen}
        onClose={() => setWidgetOpen(false)}
      />

    </div>
  );
};