// apps/hub-central/components/global/UniversalComment.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { CommentTargetType, UniversalComment as IUniversalComment } from '@ilot/types';
import { CommentItem } from './CommentItem';
import { useCommentDrawer } from './UniversalCommentDrawer';
import { MessageSquarePlus, Loader2, Sparkles } from 'lucide-react';

interface UniversalCommentProps {
  targetUid: string;
  targetType: CommentTargetType;
  currentAuthorUid?: string;
}

export const UniversalComment: React.FC<UniversalCommentProps> = ({
  targetUid,
  targetType,
  currentAuthorUid = 'anonymous',
}) => {
  const { openDrawer } = useCommentDrawer();
  const [comments, setComments] = useState<IUniversalComment[]>([]);
  const [loading, setLoading] = useState(true);

  // Récupération des échos associés à cette cible (produit, sujet, etc.)
  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/comments?targetUid=${targetUid}`);
      const data = await res.json();
      if (data.success || Array.isArray(data)) {
        setComments(data.data || data);
      }
    } catch (err) {
      console.error("Erreur lors de la récupération des échos :", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (targetUid) {
      fetchComments();
    }
  }, [targetUid]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Sparkles size={16} className="text-emerald-400" /> Échos & Résonances ({comments.length})
        </h4>
        <button
          onClick={() => openDrawer(targetUid, targetType)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2 shadow-lg"
        >
          <MessageSquarePlus size={14} /> Laisser un écho
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-slate-500 gap-2 text-xs font-mono">
          <Loader2 className="animate-spin text-emerald-400" size={16} /> Chargement des échos de la canopée...
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-10 bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-500 text-xs font-mono uppercase tracking-widest">
          Aucun écho pour le moment. Sois le premier à faire résonner ta pensée.
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.uid}
              comment={comment as any}
              currentAuthorUid={currentAuthorUid}
            />
          ))}
        </div>
      )}
    </div>
  );
};