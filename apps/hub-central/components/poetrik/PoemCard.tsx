// apps/hub-central/components/poetrik/PoemCard.tsx
import React from 'react';

interface PoemAuthor {
  uid: string;
  pseudo: string;
  avatarUrl?: string;
}

interface PoemCardProps {
  uid: string;
  title: string;
  content: string;
  format: string;
  author: PoemAuthor;
  catharsisVeil?: boolean;
  onTransferToArena?: (uid: string) => void;
}

export const PoemCard: React.FC<PoemCardProps> = ({
  uid,
  title,
  content,
  format,
  author,
  catharsisVeil = false,
  onTransferToArena,
}) => {
  return (
    <article className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl w-full max-w-2xl mx-auto flex flex-col gap-6 relative overflow-hidden">
      
      {/* Galerie des Visages (En-tête) */}
      <div className="flex items-center gap-3 border-b border-slate-800/60 pb-4 z-10">
        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center">
          {author.avatarUrl ? (
            <img src={author.avatarUrl} alt={author.pseudo} className="w-full h-full object-cover" />
          ) : (
            <span className="text-slate-400 text-sm">🪶</span>
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-slate-200">{author.pseudo}</span>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest">{format.replace('_', ' ')}</span>
        </div>
        
        {catharsisVeil && (
          <span className="ml-auto text-xs px-2 py-1 bg-indigo-950/50 text-indigo-300 border border-indigo-900/50 rounded-md" title="Sanctuaire : Commentaires désactivés">
            🛡️ Voile de Catharsis
          </span>
        )}
      </div>

      {/* Le Vers */}
      <div className="flex flex-col gap-2 z-10">
        <h2 className="text-xl font-serif font-bold text-slate-100">{title}</h2>
        <div className="text-slate-300 font-serif leading-loose whitespace-pre-wrap">
          {content}
        </div>
      </div>

      {/* Barre d'Actions (Écosystème) */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800/60 z-10">
        {!catharsisVeil ? (
          <button className="text-xs text-slate-400 hover:text-emerald-400 transition-colors">
            💧 Déposer une Goutte de Rosée (Like)
          </button>
        ) : (
          <span className="text-xs text-slate-500 italic">Le silence entoure ce poème.</span>
        )}

        {onTransferToArena && (
          <button 
            onClick={() => onTransferToArena(uid)}
            className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-emerald-950 hover:text-emerald-300 border border-slate-700 hover:border-emerald-800 rounded-lg transition-all"
          >
            ⚔️ Transférer vers LyriKa
          </button>
        )}
      </div>
    </article>
  );
};