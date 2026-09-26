'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit3, Trash2, Loader2, Feather, Diamond, ArrowRightLeft, BookMarked } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface AuthorStudioViewProps {
  currentUserUid: string;
  onEditBook: (book: any) => void;
}

export function AuthorStudioView({ currentUserUid, onEditBook }: AuthorStudioViewProps) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: response, isLoading } = useQuery({
    queryKey: ['author-books', currentUserUid],
    queryFn: async () => {
      const res = await fetch(`/api/bibliotek?authorUid=${currentUserUid}&status=ALL&limit=50`);
      if (!res.ok) throw new Error("Échec de la récupération du Studio.");
      return res.json();
    }
  });

  const books = response?.data || [];

  const filteredBooks = useMemo(() => {
    return books.filter((book: any) => {
      const matchesStatus = statusFilter === 'ALL' || book.status === statusFilter;
      const term = searchTerm.toLowerCase();
      const matchesSearch = book.title?.toLowerCase().includes(term) || book.writingType?.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [books, statusFilter, searchTerm]);

  const deleteMutation = useMutation({
    mutationFn: async (slug: string) => {
      const res = await fetch(`/api/bibliotek/${slug}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Échec de la dissolution.");
      return res.json();
    },
    onSuccess: () => {
      toast.success("L'ouvrage a été réduit en cendres.");
      queryClient.invalidateQueries({ queryKey: ['author-books', currentUserUid] });
    },
    onError: (err: any) => toast.error(`Erreur : ${err.message}`)
  });

  const handleDelete = (slug: string) => {
    if (confirm("Désintégrer définitivement cet ouvrage du Sanctuaire ?")) {
      deleteMutation.mutate(slug);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2 sm:pb-0">
          {['ALL', 'DRAFT', 'PUBLISHED', 'ARCHIVED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status as any)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${
                statusFilter === status 
                  ? 'bg-white text-black shadow-lg' 
                  : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              {status === 'ALL' ? 'Tous' : status === 'DRAFT' ? 'Brouillons' : status === 'PUBLISHED' ? 'Publiés' : 'Archivés'}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher une œuvre..."
            className="w-full bg-black/40 border border-white/10 px-4 py-2.5 rounded-xl text-xs text-white outline-none focus:border-[#E5484D] font-mono"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#E5484D]" />
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="py-20 text-center space-y-4 bg-black/20 border border-white/5 rounded-3xl">
          <Feather className="w-10 h-10 mx-auto text-slate-600" />
          <p className="text-xs font-mono uppercase tracking-widest text-slate-500">Aucun manuscrit trouvé dans cette catégorie.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBooks.map((book: any) => {
            const isPublished = book.status === 'PUBLISHED';

            return (
              <div key={book.uid} className="group relative bg-black/40 border border-white/10 rounded-3xl p-6 hover:border-[#E5484D] transition-all flex flex-col justify-between space-y-6">
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border ${
                      isPublished ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {book.status}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">{book.writingType}</span>
                  </div>
                  
                  <h3 className="text-xl font-black uppercase text-white group-hover:text-[#E5484D] transition-colors line-clamp-1">
                    {book.title}
                  </h3>
                  
                  <div className="flex flex-wrap gap-3 pt-2">
                    {book.economy?.priceCents > 0 && (
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-lg">
                        <Diamond size={12} /> {(book.economy.priceCents / 100).toFixed(2)} €
                      </span>
                    )}
                    {book.economy?.barterAllowed && (
                      <span className="text-[10px] font-mono text-sky-400 flex items-center gap-1 bg-sky-500/10 px-2 py-1 rounded-lg">
                        <ArrowRightLeft size={12} /> Troc Actif
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-4">
                  <div className="flex text-slate-400 text-xs font-mono">
                    <Link 
                      href={`/resonance/annotations`} 
                      className="flex items-center gap-1.5 hover:text-amber-400 transition-colors" 
                      title="Consulter le Codex pour voir les résonances"
                    >
                      <BookMarked size={14} /> <span>Codex des Résonances</span>
                    </Link>
                  </div>
                  
                  <div className="flex gap-2">
                    {/* 🛡️ Rétablissement des data-testid ici */}
                    <button 
                      onClick={() => onEditBook(book)}
                      className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all border border-transparent hover:border-white/10"
                      title="Reprendre la rédaction"
                      data-testid={`edit-btn-${book.uid}`}
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(book.slug || book.uid)}
                      disabled={deleteMutation.isPending}
                      className="p-2 hover:bg-red-500/10 rounded-xl text-slate-400 hover:text-red-500 transition-all border border-transparent hover:border-red-500/20 disabled:opacity-50"
                      title="Brûler l'œuvre"
                      data-testid={`delete-btn-${book.uid}`}
                    >
                      {deleteMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}