// apps/hub-central/components/resonance/annotations/TextSelectionWrapper.tsx
'use client';

import React, { useState } from 'react';
import { Sparkles, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface TextSelectionWrapperProps {
  targetUid: string;
  targetType: 'BOOK' | 'ARTICLE' | 'COMMENT';
  targetTitle: string;
  children: React.ReactNode;
}

const QUICK_EMOJIS = ['<(:<', '🔥', '💡', '✨', '🌊', '🔮'];

export function TextSelectionWrapper({ targetUid, targetType, targetTitle, children }: TextSelectionWrapperProps) {
  const [selectedText, setSelectedText] = useState<string>('');
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedEmoji, setSelectedEmoji] = useState<string>('<(:<');
  const [commentInput, setCommentInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      if (!isModalOpen) setPopupPosition(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedText) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUid,
          targetType,
          targetTitle,
          selectedText,
          emotion: selectedEmoji,
          comment: commentInput.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Échec de l'envoi de la vibration.");

      toast.success("✨ Fulgurance consignée dans le Codex !");
      setIsModalOpen(false);
      setCommentInput('');
      setSelectedEmoji('<(:<');
      setSelectedText('');
      setPopupPosition(null);
      window.getSelection()?.removeAllRanges();
    } catch (err: any) {
      toast.error(`🚨 Erreur : ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div onMouseUp={handleMouseUp} className="relative select-text">
      {children}

      {/* Bouton contextuel de surlignage */}
      {popupPosition && !isModalOpen && (
        <div className="fixed z-50 transform -translate-x-1/2 -translate-y-full mb-3" style={{ left: popupPosition.x, top: popupPosition.y }}>
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="bg-[#E5484D] text-white px-4 py-2 rounded-xl text-xs font-sans font-bold shadow-2xl flex items-center gap-2 hover:bg-[#D43D42] transition-all scale-105"
          >
            <Sparkles size={14} /> Vibrer sur ce passage ✨
          </button>
        </div>
      )}

      {/* Modale de validation de la fulgurance */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 font-sans">
          <div className="w-full max-w-lg bg-[#1A1D24] border border-[#30363D] rounded-3xl p-6 md:p-8 shadow-2xl relative space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#30363D]">
              <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Sparkles size={16} className="text-amber-400" /> Surlignage Émotionnel
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-xs text-[#8B949E] hover:text-white"><X size={18} /></button>
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#8B949E] uppercase tracking-wider">Passage sélectionné :</label>
              <blockquote className="border-l-2 border-[#E5484D] pl-3 italic text-xs text-[#C9D1D9] bg-[#121417] p-3 rounded-r-xl max-h-24 overflow-y-auto">&ldquo;{selectedText}&rdquo;</blockquote>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#8B949E] uppercase tracking-wider">Choisir une vibration :</label>
                <div className="flex flex-wrap gap-2">
                  {QUICK_EMOJIS.map((emo) => (
                    <button
                      type="button"
                      key={emo}
                      onClick={() => setSelectedEmoji(emo)}
                      className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all border ${
                        selectedEmoji === emo 
                          ? 'bg-[#E5484D]/20 border-[#E5484D] text-white scale-105 shadow-md' 
                          : 'bg-[#121417] border-[#30363D] text-[#8B949E] hover:text-white'
                      }`}
                    >
                      {emo}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#8B949E] uppercase tracking-wider">Mot ou pensée pour l'auteur (Optionnel) :</label>
                <textarea 
                  value={commentInput} 
                  onChange={(e) => setCommentInput(e.target.value)} 
                  placeholder="Partage ton écho avec l'auteur..." 
                  rows={3} 
                  className="w-full bg-[#121417] border border-[#30363D] rounded-xl p-3 text-xs text-white outline-none focus:border-[#E5484D] resize-none" 
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-transparent text-[#8B949E] hover:text-white text-xs font-medium">Annuler</button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-[#E5484D] hover:bg-[#D43D42] text-white font-black uppercase text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50">
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : 'Diffuser l\'écho'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}