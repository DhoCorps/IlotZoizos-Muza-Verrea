// apps/hub-central/components/sujets/SujetCard.tsx
'use client';

import { useState } from 'react';
import { FileText, Loader2, Trash2, Edit3, MessageCircle, Play, Eye } from 'lucide-react';
import { ISujet, CAPABILITIES } from '@ilot/types';

interface SujetCardProps {
  sujet: ISujet;
  onEdit: (uid: string) => void;
  onDelete?: (uid: string) => void;
  currentUserUid: string;
  myCapabilities?: string[];
}

export function SujetCard({ sujet, onEdit, onDelete, currentUserUid, myCapabilities = [] }: SujetCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  // Souveraineté : Est-ce mon monologue ou suis-je l'Architecte ?
  const isMine = sujet.authorUid === currentUserUid;
  const isArchitect = myCapabilities.includes('*');
  const canEdit = isMine || isArchitect;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Anéantir ce monologue ? Les échos dans le Graphe seront tranchés.")) return;
    setIsDeleting(true);
    if (onDelete) await onDelete(sujet.uid);
    setIsDeleting(false); // Si on ne détruit pas le composant
  };

  return (
    <div className="group relative bg-black/40 border border-white/10 rounded-2xl p-6 hover:border-[#E5484D] transition-all">
      <div className={`bio-card p-4 border-l-4 transition-all hover:shadow-[0_0_20px_rgba(229,72,77,0.05)] flex flex-col justify-between ${
        sujet.status === 'PUBLISHED' ? 'border-l-emerald-500 bg-emerald-500/5' : 'border-l-[#E5484D]'
      }`}>
        
        {/* EN-TÊTE : Titre et Actions */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-black px-2 py-0.5 rounded bg-white/5 text-slate-400 uppercase">
                {sujet.category}
              </span>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                sujet.status === 'PUBLISHED' ? 'bg-green-500/10 text-green-500' : 'bg-slate-500/10 text-slate-500'
              }`}>
                {sujet.status}
              </span>
            </div>
            <h3 className="text-xl font-bold uppercase tracking-tight text-white">{sujet.title}</h3>
          </div>

          {/* ACTIONS SOUVERAINES */}
          {canEdit && (
            <div className="flex gap-2">
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit(sujet.uid); }} 
                className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-all"
                title="Ajuster la pensée"
              >
                <Edit3 size={16} />
              </button>
              <button 
                onClick={handleDelete} 
                disabled={isDeleting}
                className="p-2 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-500 transition-all disabled:opacity-50"
                title="Brûler le texte"
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              </button>
            </div>
          )}
        </div>

        {/* CORPS : Extrait du monologue */}
        <p className="text-sm text-slate-400 line-clamp-3 mb-6 italic border-l-2 border-white/5 pl-3">
          "{sujet.content}"
        </p>

        {/* PIED DE CARTE : Médias et Connexions */}
        <div className="flex items-center justify-between border-t border-white/5 pt-4 text-slate-500 text-xs font-mono">
          <div className="flex gap-4">
            {sujet.media?.audioTrackUrl && (
              <div className="flex items-center gap-1 text-emerald-400" title="Fréquence Audio Attachée">
                <Play size={12} /> <span className="text-[10px]">Track</span>
              </div>
            )}
            {sujet.connections?.relatedProjects?.length > 0 && (
              <div className="flex items-center gap-1" title="Chantiers Illuminés">
                <FileText size={12} /> <span className="text-[10px]">{sujet.connections.relatedProjects.length} Nœuds</span>
              </div>
            )}
          </div>
          
          {/* Statistiques de Résonance */}
          <div className="flex gap-3">
             <div className="flex items-center gap-1" title="Vues">
                <Eye size={12} /> <span>{sujet.resonance?.views || 0}</span>
             </div>
             {sujet.settings?.allowComments && (
               <div className="flex items-center gap-1" title="Échos">
                  <MessageCircle size={12} /> <span>...</span>
               </div>
             )}
          </div>
        </div>

      </div>
    </div>
  );
}