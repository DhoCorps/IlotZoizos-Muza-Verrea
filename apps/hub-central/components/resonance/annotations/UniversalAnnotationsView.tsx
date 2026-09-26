// apps/hub-central/components/resonance/annotations/UniversalAnnotationsView.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, FileText, MessageSquare, Star, Calendar, Filter, Search, Trash2, Loader2, AlertTriangle, X, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

type SortCriteria = 'date' | 'importance' | 'target';
type TargetTypeFilter = 'ALL' | 'BOOK' | 'ARTICLE' | 'COMMENT';

export function UniversalAnnotationsView() {
  const [sortBy, setSortBy] = useState<SortCriteria>('date');
  const [typeFilter, setTypeFilter] = useState<TargetTypeFilter>('ALL');
  const [selectedTargetUid, setSelectedTargetUid] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 🛡️ État local pour la modale de confirmation moderne
  const [annotationToDelete, setAnnotationToDelete] = useState<{ uid: string; targetTitle?: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // 🌀 SUTURE REACT QUERY : Récupération des notes universelles de l'Oiseau
  const { data: annotations = [], isLoading, refetch } = useQuery({
    queryKey: ['universal-annotations'],
    queryFn: async () => {
      const res = await fetch('/api/annotations');
      if (!res.ok) throw new Error("Échec de la récupération des notes.");
      const json = await res.json();
      return json.data || [];
    }
  });

  // Filtrage et Tri dynamiques
  const processedAnnotations = useMemo(() => {
    let result = [...annotations];

    // Filtre par type de cible (BOOK, ARTICLE, COMMENT)
    if (typeFilter !== 'ALL') {
      result = result.filter((item: any) => item.targetType === typeFilter);
    }

    // Filtre par cible spécifique
    if (selectedTargetUid !== 'ALL') {
      result = result.filter((item: any) => item.targetUid === selectedTargetUid);
    }

    // Filtre par recherche textuelle
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item: any) => 
        item.selectedText.toLowerCase().includes(query) || 
        item.comment?.toLowerCase().includes(query) ||
        item.targetTitle?.toLowerCase().includes(query)
      );
    }

    // Tri
    result.sort((a, b) => {
      if (sortBy === 'importance') {
        return (b.importance || 1) - (a.importance || 1);
      } else if (sortBy === 'target') {
        return (a.targetTitle || '').localeCompare(b.targetTitle || '');
      } else {
        // 'date' par défaut (du plus récent au plus ancien)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return result;
  }, [annotations, sortBy, typeFilter, selectedTargetUid, searchQuery]);

  // Liste unique des cibles disponibles pour affiner le filtre
  const uniqueTargets = useMemo(() => {
    const map = new Map();
    annotations.forEach((item: any) => {
      if (!map.has(item.targetUid)) {
        map.set(item.targetUid, {
          title: item.targetTitle || item.targetUid,
          type: item.targetType
        });
      }
    });
    return Array.from(map.entries()).map(([uid, info]) => ({ uid, ...info }));
  }, [annotations]);

  // Exécution de la suppression
  const confirmDeleteAnnotation = async () => {
    if (!annotationToDelete) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/annotations/${annotationToDelete.uid}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Échec de la suppression.");
      toast.success("Note dissoute dans le néant.");
      setAnnotationToDelete(null);
      refetch();
    } catch (err: any) {
      toast.error(`Erreur : ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const getTargetIcon = (type: string) => {
    switch (type) {
      case 'BOOK': return <BookOpen size={14} className="text-[#E5484D]" />;
      case 'ARTICLE': return <FileText size={14} className="text-sky-400" />;
      case 'COMMENT': return <MessageSquare size={14} className="text-amber-400" />;
      default: return <Sparkles size={14} className="text-purple-400" />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-8 bg-[#121417] text-[#E1E4E8] rounded-3xl border border-[#2A2E39] shadow-2xl font-serif relative">
      
      {/* En-tête */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#2A2E39] pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-wide text-[#F0F3F6]">Le Codex des Notes & Passages</h2>
          <p className="text-xs text-[#8B949E] font-sans mt-1">Réflexions, fulgurances et vibrations consignées à travers la matrice</p>
        </div>

        {/* Contrôles de Recherche et Tri */}
        <div className="flex flex-wrap items-center gap-3 font-sans text-xs">
          
          {/* Recherche */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B949E]" />
            <input
              type="text"
              placeholder="Chercher dans les notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#1A1D24] border border-[#2A2E39] rounded-xl pl-9 pr-4 py-2 text-[#F0F3F6] outline-none focus:border-[#E5484D] placeholder-[#484F58]"
            />
          </div>

          {/* Tri */}
          <div className="flex items-center gap-2 bg-[#1A1D24] border border-[#2A2E39] px-3 py-2 rounded-xl">
            <Filter size={14} className="text-[#8B949E]" />
            <span className="text-[#8B949E]">Trier :</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortCriteria)}
              className="bg-transparent text-[#F0F3F6] outline-none cursor-pointer font-semibold"
            >
              <option value="date" className="bg-[#1A1D24]">Date</option>
              <option value="importance" className="bg-[#1A1D24]">Importance</option>
              <option value="target" className="bg-[#1A1D24]">Cible</option>
            </select>
          </div>

        </div>
      </div>

      {/* Filtres par Type de Cible (ALL, BOOK, ARTICLE, COMMENT) */}
      <div className="flex flex-wrap items-center gap-2 font-sans text-xs">
        <span className="text-[#8B949E] uppercase tracking-wider text-[10px] font-bold mr-2">Module :</span>
        {[
          { key: 'ALL', label: 'Tous' },
          { key: 'BOOK', label: '📖 Livres' },
          { key: 'ARTICLE', label: '📝 Articles' },
          { key: 'COMMENT', label: '💬 Commentaires' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setTypeFilter(tab.key as TargetTypeFilter); setSelectedTargetUid('ALL'); }}
            className={`px-3 py-1.5 rounded-lg transition-all ${typeFilter === tab.key ? 'bg-[#E5484D] text-white font-bold' : 'bg-[#1A1D24] text-[#8B949E] border border-[#2A2E39]'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filtre secondaire par Cible précise */}
      {uniqueTargets.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-sans text-xs custom-scrollbar">
          <span className="text-[#8B949E] uppercase tracking-wider text-[10px] font-bold shrink-0">Œuvre / Cible :</span>
          <button
            onClick={() => setSelectedTargetUid('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all shrink-0 ${selectedTargetUid === 'ALL' ? 'bg-white/10 text-white font-bold' : 'bg-[#1A1D24] text-[#8B949E] border border-[#2A2E39]'}`}
          >
            Toutes ({annotations.length})
          </button>
          {uniqueTargets
            .filter((t) => typeFilter === 'ALL' || t.type === typeFilter)
            .map((t) => (
              <button
                key={t.uid}
                onClick={() => setSelectedTargetUid(t.uid)}
                className={`px-3 py-1.5 rounded-lg truncate max-w-[220px] transition-all shrink-0 flex items-center gap-1.5 ${selectedTargetUid === t.uid ? 'bg-white/10 text-white font-bold' : 'bg-[#1A1D24] text-[#8B949E] border border-[#2A2E39]'}`}
              >
                {getTargetIcon(t.type)} <span className="truncate">{t.title}</span>
              </button>
            ))}
        </div>
      )}

      {/* Liste des Notes */}
      {isLoading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#E5484D]" />
        </div>
      ) : processedAnnotations.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-[#1A1D24]/50 border border-[#2A2E39] rounded-2xl">
          <BookOpen className="w-10 h-10 mx-auto text-[#484F58]" />
          <p className="text-xs font-sans text-[#8B949E] uppercase tracking-widest">Aucune note ou fulgurance trouvée.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {processedAnnotations.map((item: any) => (
            <div 
              key={item.uid}
              className="bg-[#1A1D24] border border-[#2A2E39] hover:border-[#383F52] p-6 rounded-2xl space-y-4 transition-all shadow-md group"
            >
              {/* En-tête de la carte */}
              <div className="flex justify-between items-center font-sans text-xs border-b border-[#2A2E39] pb-3">
                <span className="font-bold text-[#F0F3F6] flex items-center gap-2 truncate max-w-[60%]">
                  {getTargetIcon(item.targetType)} 
                  <span className="truncate">{item.targetTitle || item.targetUid}</span>
                </span>

                <div className="flex items-center gap-3">
                  {/* Importance en étoiles */}
                  <div className="flex items-center gap-1 text-amber-400" title={`Importance : ${item.importance || 1}/5`}>
                    {Array.from({ length: item.importance || 1 }).map((_, idx) => (
                      <Star key={idx} size={12} fill="currentColor" />
                    ))}
                  </div>

                  {item.emotion && (
                    <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-[10px] font-mono">
                      {item.emotion}
                    </span>
                  )}

                  <span className="text-[#8B949E] text-[10px] flex items-center gap-1">
                    <Calendar size={10} /> {new Date(item.createdAt).toLocaleDateString()}
                  </span>

                  <button
                    onClick={() => setAnnotationToDelete({ uid: item.uid, targetTitle: item.targetTitle })}
                    className="text-[#8B949E] hover:text-[#E5484D] opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                    title="Supprimer la note"
                    data-testid={`delete-annot-${item.uid}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Texte Surligné */}
              <blockquote className="border-l-2 border-[#E5484D] pl-4 italic text-[#C9D1D9] text-sm bg-[#121417]/40 py-2 rounded-r-lg">
                &ldquo;{item.selectedText}&rdquo;
              </blockquote>

              {/* Réflexion personnelle */}
              {item.comment && (
                <div className="bg-[#121417] p-4 rounded-xl border border-[#2A2E39] text-xs font-sans text-[#E1E4E8] space-y-1">
                  <span className="text-[10px] font-bold text-[#8B949E] uppercase tracking-wider block">Réflexion personnelle :</span>
                  <p>{item.comment}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modale de confirmation moderne */}
      {annotationToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 font-sans animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#1A1D24] border border-[#2A2E39] rounded-3xl p-6 md:p-8 shadow-2xl relative space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#2A2E39]">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle size={20} />
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Dissoudre la note</h3>
              </div>
              <button 
                onClick={() => setAnnotationToDelete(null)} 
                className="text-xs text-[#8B949E] hover:text-white"
                data-testid="cancel-delete-modal-x"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-[#C9D1D9] leading-relaxed">
              Es-tu sûr(e) de vouloir effacer définitivement cette note liée à <span className="font-bold text-white">&laquo; {annotationToDelete.targetTitle || 'cette œuvre'} &raquo;</span> du Codex ?
            </p>

            <div className="pt-4 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setAnnotationToDelete(null)} 
                className="px-4 py-2 bg-transparent text-[#8B949E] hover:text-white text-xs font-medium transition-colors"
                data-testid="cancel-delete-btn"
              >
                Conserver
              </button>
              <button 
                type="button" 
                disabled={isDeleting}
                onClick={confirmDeleteAnnotation} 
                className="px-6 py-2.5 bg-[#E5484D] hover:bg-[#D43D42] text-white font-black uppercase text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                data-testid="confirm-delete-btn"
              >
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : 'Dissoudre'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}