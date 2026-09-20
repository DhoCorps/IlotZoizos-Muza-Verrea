import React from 'react';
import { UniversalComment } from '@ilot/types';
import { BookOpen, EyeOff, Trash2, ExternalLink, Scroll } from 'lucide-react';

export interface RegistreDesEchosProps {
  comments: UniversalComment[];
  onNavigateToArtifact?: (targetUid: string, targetType: string) => void;
  onToggleOccult?: (commentUid: string) => void;
  onDisintegrate?: (commentUid: string) => void;
}

export const RegistreDesEchos: React.FC<RegistreDesEchosProps> = ({
  comments = [],
  onNavigateToArtifact,
  onToggleOccult,
  onDisintegrate,
}) => {
  if (comments.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
        <BookOpen className="mx-auto text-slate-600" size={32} />
        <p className="text-sm font-mono text-slate-400">Votre registre est vierge. Aucun écho n'a encore sédimenté.</p>
      </div>
    );
  }

  return (
    <section className="space-y-4" aria-labelledby="registre-echos-title">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 id="registre-echos-title" className="text-lg font-black uppercase text-slate-100 flex items-center gap-2">
            <BookOpen className="text-emerald-400" size={20} />
            <span>Registre des Échos</span>
          </h2>
          <p className="text-xs font-mono text-slate-400">
            Historique et gestion de vos interventions poétiques et critiques ({comments.length}).
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {comments.map((comment) => (
          <article
            key={comment.uid || (comment as any)._id}
            className={`p-4 bg-slate-900 border rounded-2xl shadow-sm space-y-3 transition-all ${
              comment.isHidden ? 'border-slate-800 opacity-60' : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 font-mono">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase text-[10px]">
                  {comment.targetType}
                </span>
                {comment.isScholarSealed && (
                  <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-300 text-[10px] flex items-center gap-1 font-semibold">
                    <Scroll size={10} /> Sceau de l'Érudit
                  </span>
                )}
              </div>
              <span>{comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : 'Récemment'}</span>
            </div>

            <p className={`text-sm leading-relaxed ${comment.isHidden ? 'text-slate-500 italic' : 'text-slate-200'}`}>
              {comment.isHidden ? 'Cet écho est actuellement occulte.' : comment.content}
            </p>

            {/* Boutons d'action souveraine */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-800/60 text-xs">
              {onNavigateToArtifact && (
                <button
                  onClick={() => onNavigateToArtifact(comment.targetUid, comment.targetType)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <ExternalLink size={12} /> Aller à l'œuvre
                </button>
              )}

              {onToggleOccult && (
                <button
                  onClick={() => onToggleOccult(comment.uid)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-amber-950/50 text-slate-300 hover:text-amber-400 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <EyeOff size={12} /> {comment.isHidden ? 'Restaurer' : 'Rendre Occulte'}
                </button>
              )}

              {onDisintegrate && (
                <button
                  onClick={() => onDisintegrate(comment.uid)}
                  className="px-3 py-1.5 bg-red-950/20 hover:bg-red-900/40 text-red-400 border border-red-900/30 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Trash2 size={12} /> Désintégrer
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};