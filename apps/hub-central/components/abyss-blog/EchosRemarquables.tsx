import React from 'react';
import { UniversalComment } from '@ilot/types';
import { Scroll, Sparkles } from 'lucide-react';

export interface EchosRemarquablesProps {
  comments: UniversalComment[];
}

export const EchosRemarquables: React.FC<EchosRemarquablesProps> = ({ comments = [] }) => {
  // Filtrer uniquement les échos porteurs du Sceau de l'Érudit et non occultés
  const sealedComments = comments.filter((comment) => comment.isScholarSealed && !comment.isHidden);

  if (sealedComments.length === 0) {
    return null;
  }

  return (
    <section 
      className="my-12 p-6 bg-gradient-to-br from-amber-950/20 via-slate-900 to-slate-950 border border-amber-500/30 rounded-3xl shadow-xl space-y-6"
      aria-labelledby="echos-remarquables-title"
    >
      <div className="flex items-center gap-3 border-b border-amber-500/20 pb-4">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
          <Scroll size={20} />
        </div>
        <div>
          <h3 id="echos-remarquables-title" className="text-lg font-black uppercase text-amber-300 tracking-wider flex items-center gap-2">
            <span>Échos Remarquables</span>
            <Sparkles size={14} className="text-amber-400 animate-pulse" />
          </h3>
          <p className="text-xs font-mono text-slate-400">
            Ces pensées ont reçu le Sceau de l'Érudit et sédimentent au cœur de l'œuvre.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {sealedComments.map((comment) => (
          <article 
            key={comment.uid || (comment as any)._id}
            className="p-4 bg-black/40 border border-amber-500/20 rounded-2xl shadow-inner space-y-3 transition-all hover:border-amber-500/40"
          >
            <div className="flex justify-between items-center text-[10px] font-mono text-amber-400/80">
              <span className="flex items-center gap-1.5 font-bold">
                <span>Oiseau :</span> {comment.authorUid?.substring(0, 8) || 'Anonyme'}
              </span>
              <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-300 font-semibold flex items-center gap-1">
                📜 Sceau de l'Érudit
              </span>
            </div>

            <p className="text-sm text-slate-200 italic font-serif leading-relaxed">
              &ldquo;{comment.content}&rdquo;
            </p>

            <div className="text-[10px] font-mono text-slate-500 text-right">
              {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : 'Récemment'}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};