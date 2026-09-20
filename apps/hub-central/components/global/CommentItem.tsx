import React, { useState } from 'react';
import { UniversalComment } from '@ilot/types';

export interface CommentItemProps {
  comment: UniversalComment & { children?: UniversalComment[] };
  currentAuthorUid: string;
  onReply?: (parentUid: string) => void;
  onOccult?: (commentUid: string) => void;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  currentAuthorUid,
  onReply,
  onOccult,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const isAuthor = comment.authorUid === currentAuthorUid;

  return (
    <div className="flex flex-col space-y-3 pl-4 border-l border-slate-800 my-2">
      <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg shadow-sm space-y-2">
        {/* En-tête du commentaire */}
        <div className="flex justify-between items-center text-xs text-slate-400">
          <span className="font-mono text-emerald-400">Oiseau: {comment.authorUid.slice(0, 8)}...</span>
          
          <div className="flex items-center space-x-2">
            {/* 🛡️ Le Sceau de l'Érudit (SEO-boosting badge) */}
            {comment.isScholarSealed && (
              <span 
                title="Sceau de l'Érudit : Ce commentaire élève la qualité globale de l'œuvre."
                className="px-2 py-0.5 text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-full"
              >
                📜 Sceau de l'Érudit
              </span>
            )}
            
            <span className="text-[10px]">
              {comment.createdAt ? new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Récemment'}
            </span>
          </div>
        </div>

        {/* Corps du message ou état occulté */}
        {comment.isHidden ? (
          <p className="text-xs text-slate-600 italic">Cet écho a été occulté par son auteur.</p>
        ) : (
          <p className="text-sm text-slate-200 whitespace-pre-wrap">{comment.content}</p>
        )}

        {/* Actions (Répondre, Occulter) */}
        {!comment.isHidden && (
          <div className="flex items-center space-x-4 pt-1 text-xs">
            {onReply && (
              <button 
                onClick={() => onReply(comment.uid)}
                className="text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Répondre
              </button>
            )}

            {isAuthor && onOccult && !comment.isHidden && (
              <button 
                onClick={() => onOccult(comment.uid)}
                className="text-slate-500 hover:text-red-400 transition-colors"
              >
                Rendre occulte
              </button>
            )}
          </div>
        )}
      </div>

      {/* RÉSURSIVITÉ : Affichage des enfants si présents */}
      {comment.children && comment.children.length > 0 && (
        <div className="flex flex-col space-y-2">
          {comment.children.map((child) => (
            <CommentItem 
              key={child.uid} 
              comment={child as any} 
              currentAuthorUid={currentAuthorUid}
              onReply={onReply}
              onOccult={onOccult}
            />
          ))}
        </div>
      )}
    </div>
  );
};