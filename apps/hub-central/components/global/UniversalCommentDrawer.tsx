import React, { useState, useEffect } from 'react';
import { create } from 'zustand';
import { CommentTargetType } from '@ilot/types';

interface CommentDrawerState {
  isOpen: boolean;
  targetUid: string | null;
  targetType: CommentTargetType | null;
  openDrawer: (targetUid: string, targetType: CommentTargetType) => void;
  closeDrawer: () => void;
}

export const useCommentDrawer = create<CommentDrawerState>((set) => ({
  isOpen: false,
  targetUid: null,
  targetType: null,
  openDrawer: (targetUid, targetType) => set({ isOpen: true, targetUid, targetType }),
  closeDrawer: () => set({ isOpen: false, targetUid: null, targetType: null }),
}));

export const useCommentMutations = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const submitComment = async (_content: string, _targetUid: string) => {
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 50));
    setIsSubmitting(false);
    
    const isJackpot = Math.random() > 0.8; 
    return { success: true, isJackpot };
  };

  return { submitComment, isSubmitting };
};

const useArtifactResonance = (_targetUid: string | null) => {
  const [hasReacted, setHasReacted] = useState(false);
  const reactToArtifact = () => setHasReacted(true);
  return { hasReacted, reactToArtifact };
};

interface UniversalCommentDrawerProps {
  // Prop optionnelle injectée par les tests pour contourner les limites d'espionnage des hooks
  testSubmitOverride?: (content: string, targetUid: string) => Promise<{ success: boolean; isJackpot: boolean }>;
}

export const UniversalCommentDrawer: React.FC<UniversalCommentDrawerProps> = ({ testSubmitOverride }) => {
  const { isOpen, targetUid, closeDrawer } = useCommentDrawer();
  const { hasReacted, reactToArtifact } = useArtifactResonance(targetUid);
  const { submitComment: defaultSubmit, isSubmitting: defaultIsSubmitting } = useCommentMutations();

  const submitComment = testSubmitOverride || defaultSubmit;
  const isSubmitting = testSubmitOverride ? false : defaultIsSubmitting;

  const [content, setContent] = useState('');
  const [showJackpot, setShowJackpot] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDrawer(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [closeDrawer]);

  if (!isOpen || !targetUid) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const result = await submitComment(content, targetUid);
    
    if (result.success) {
      setContent('');
      if (result.isJackpot) {
        setShowJackpot(true);
        setTimeout(() => setShowJackpot(false), 3000);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      <div 
        className="relative w-full max-w-md h-full bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out translate-x-0"
        role="dialog"
        aria-label="Tiroir des résonances"
      >
        <header className="flex justify-between items-center p-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-slate-100">Échos & Résonances</h2>
          <button 
            onClick={closeDrawer}
            className="text-slate-400 hover:text-white transition-colors"
            aria-label="Fermer le tiroir"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
           <p className="text-sm text-slate-500 italic text-center mt-10">
             Les échos précédents sédimentent ici...
           </p>
        </div>

        <footer className="p-4 bg-slate-800/50 border-t border-slate-800 relative overflow-hidden">
          
          {showJackpot && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-r from-amber-500/90 to-purple-600/90 backdrop-blur-md animate-pulse">
              <p className="text-white font-bold text-lg text-center px-4 animate-bounce">
                🌟 Faveur du Kosmos !<br/>
                <span className="text-sm font-normal">Votre écho s'inscrit dans les étoiles.</span>
              </p>
            </div>
          )}

          {!hasReacted ? (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
              <span className="text-2xl">🤍</span>
              <p className="text-sm text-slate-300">
                Le droit de critiquer s'achète par un acte d'amour.
              </p>
              <button 
                onClick={reactToArtifact}
                className="px-4 py-2 text-sm font-medium text-white bg-slate-700 hover:bg-emerald-600 rounded-md transition-colors"
              >
                Laisser une part de soi (Réagir)
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Laissez résonner votre pensée..."
                className="w-full h-24 p-3 text-sm bg-slate-900 text-slate-100 border border-slate-700 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                disabled={isSubmitting}
                maxLength={3000}
              />
              <div className="flex justify-end">
                <button 
                  type="submit" 
                  disabled={!content.trim() || isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-md transition-colors"
                >
                  {isSubmitting ? 'Tissage...' : 'Forger l\'écho'}
                </button>
              </div>
            </form>
          )}
        </footer>
      </div>
    </div>
  );
};