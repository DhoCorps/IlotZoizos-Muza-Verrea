// apps/hub-central/components/bibliotek/BibliotekAnnotationsView.tsx
'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Star, Calendar, Filter, Search, Trash2, Loader2, AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';

type SortCriteria = 'date' | 'importance' | 'book';

export function BibliotekAnnotationsView() {
  const [sortBy, setSortBy] = useState<SortCriteria>('date');
  const [filterBookUid, setFilterBookUid] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 🛡️ État local pour la modale de confirmation moderne (remplacement de confirm())
  const [annotationToDelete, setAnnotationToDelete] = useState<{ uid: string; bookTitle: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // 🌀 SUTURE REACT QUERY : Récupération des notes de l'Oiseau
  const { data: annotations = [], isLoading, refetch } = useQuery({
    queryKey: ['bibliotek-annotations'],
    queryFn: async () => {
      const res = await fetch('/api/bibliotek/annotations');
      if (!res.ok) throw new Error("Échec de la récupération des notes.");
      const json = await res.json();
      return json.data || [];
    }
  });

  // Filtrage et Tri dynamiques
  const processedAnnotations = React.useMemo(() => {
    let result = [...annotations];

    // Filtre par livre
    if (filterBookUid !== 'ALL') {
      result = result.filter((item: any) => item.bookUid === filterBookUid);
    }

    // Filtre par recherche textuelle
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item: any) => 
        item.selectedText.toLowerCase().includes(query) || 
        item.comment?.toLowerCase().includes(query) ||
        item.bookTitle.toLowerCase().includes(query)
      );
    }

    // Tri
    result.sort((a, b) => {
      if (sortBy === 'importance') {
        return b.importance - a.importance; // Du plus important au moins important
      } else if (sortBy === 'book') {
        return a.bookTitle.localeCompare(b.bookTitle);
      } else {
        // 'date' par défaut (du plus récent au plus ancien)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return result;
  }, [annotations, sortBy, filterBookUid, searchQuery]);

  // Liste unique des livres pour le filtre
  const uniqueBooks = React.useMemo(() => {
    const map = new Map();
    annotations.forEach((item: any) => {
      if (!map.has(item.bookUid)) {
        map.set(item.bookUid, item.bookTitle);
      }
    });
    return Array.from(map.entries()).map(([uid, title]) => ({ uid, title }));
  }, [annotations]);

  // Exécution de la suppression après validation dans la modale moderne
  const confirmDeleteAnnotation = async () => {
    if (!annotationToDelete) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/bibliotek/annotations/${annotationToDelete.uid}`, { method: 'DELETE' });
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

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-8 bg-[#121417] text-[#E1E4E8] rounded-3xl border border-[#2A2E39] shadow-2xl font-serif relative">
      
      {/* En-tête */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#2A2E39] pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-wide text-[#F0F3F6]">Le Codex des Notes & Passages</h2>
          <p className="text-xs text-[#8B949E] font-sans mt-1">Accède à toutes tes réflexions de lecture sans ouvrir les ouvrages</p>
        </div>

        {/* Contrôles de Tri et Filtres */}
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
            <span className="text-[#8B949E]">Trier par :</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortCriteria)}
              className="bg-transparent text-[#F0F3F6] outline-none cursor-pointer font-semibold"
            >
              <option value="date" className="bg-[#1A1D24]">Date</option>
              <option value="importance" className="bg-[#1A1D24]">Importance</option>
              <option value="book" className="bg-[#1A1D24]">Livre</option>
            </select>
          </div>

        </div>
      </div>

      {/* Filtre secondaire par Livre */}
      {uniqueBooks.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-sans text-xs">
          <span className="text-[#8B949E] uppercase tracking-wider text-[10px] font-bold">Ouvrage :</span>
          <button
            onClick={() => setFilterBookUid('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all ${filterBookUid === 'ALL' ? 'bg-[#E5484D] text-white font-bold' : 'bg-[#1A1D24] text-[#8B949E] border border-[#2A2E39]'}`}
          >
            Tous ({annotations.length})
          </button>
          {uniqueBooks.map((b) => (
            <button
              key={b.uid}
              onClick={() => setFilterBookUid(b.uid)}
              className={`px-3 py-1.5 rounded-lg truncate max-w-[200px] transition-all ${filterBookUid === b.uid ? 'bg-[#E5484D] text-white font-bold' : 'bg-[#1A1D24] text-[#8B949E] border border-[#2A2E39]'}`}
            >
              📖 {b.title}
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
          <p className="text-xs font-sans text-[#8B949E] uppercase tracking-widest">Aucune note ou passage surligné trouvé.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {processedAnnotations.map((item: any) => (
            <div 
              key={item.uid}
              className="bg-[#1A1D24] border border-[#2A2E39] hover:border-[#383F52] p-6 rounded-2xl space-y-4 transition-all shadow-md group"
            >
              {/* Infos Livre & Importance */}
              <div className="flex justify-between items-center font-sans text-xs border-b border-[#2A2E39] pb-3">
                <span className="font-bold text-[#F0F3F6] flex items-center gap-2">
                  <BookOpen size={14} className="text-[#E5484D]" /> {item.bookTitle}
                </span>

                <div className="flex items-center gap-3">
                  {/* Étoiles d'importance (1 à 3) */}
                  <div className="flex items-center gap-1 text-amber-400" title={`Importance : ${item.importance}/3`}>
                    {Array.from({ length: item.importance }).map((_, idx) => (
                      <Star key={idx} size={12} fill="currentColor" />
                    ))}
                  </div>

                  <span className="text-[#8B949E] text-[10px] flex items-center gap-1">
                    <Calendar size={10} /> {new Date(item.createdAt).toLocaleDateString()}
                  </span>

                  <button
                    onClick={() => setAnnotationToDelete({ uid: item.uid, bookTitle: item.bookTitle })}
                    className="text-[#8B949E] hover:text-[#E5484D] opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                    title="Supprimer la note"
                    data-testid={`delete-annot-${item.uid}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Texte Surligné (Citation) */}
              <blockquote className="border-l-2 border-[#E5484D] pl-4 italic text-[#C9D1D9] text-sm bg-[#121417]/40 py-2 rounded-r-lg">
                &ldquo;{item.selectedText}&rdquo;
              </blockquote>

              {/* Commentaire Personnel de l'Oiseau */}
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

      {/* 🛡️ Modale de confirmation moderne (remplacement de l'alerte native confirm()) */}
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
              Es-tu sûr(e) de vouloir effacer définitivement cette note liée à l'ouvrage <span className="font-bold text-white">&laquo; {annotationToDelete.bookTitle} &raquo;</span> du Sanctuaire ?
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