'use client';

import React, { useState } from 'react';
import { BookOpen, Plus, Loader2, Compass, ShieldCheck, Feather, Sparkles, X, Filter, ChevronLeft, ChevronRight, LayoutDashboard } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ScriptoriumEditor } from '@/components/bibliotek/ScriptoriumEditor';
import { OracleVerifierWidget } from '@/components/bibliotek/OracleVerifierWidget';
import Link from 'next/link';

interface BibliotekClientViewProps {
  initialData: any[];
  initialTotal: number;
  initialLimit: number;
}

export function BibliotekClientView({ initialData, initialTotal, initialLimit }: BibliotekClientViewProps) {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStyle, setSelectedStyle] = useState<string>('ALL');
  const [isScriptoriumOpen, setIsScriptoriumOpen] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // 🌀 SUTURE REACT QUERY : Fetch fluide avec fallback sur les données initiales (SSR) et StaleTime optimisé
  const { data: queryResponse, isLoading } = useQuery({
    queryKey: ['bibliotek-books', selectedType, selectedStyle, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedType !== 'ALL') params.append('writingType', selectedType);
      if (selectedStyle !== 'ALL') params.append('style', selectedStyle);
      params.append('page', currentPage.toString());
      params.append('limit', initialLimit.toString());
      
      const res = await fetch(`/api/bibliotek?${params.toString()}`);
      if (!res.ok) throw new Error("Échec du recensement du Sanctuaire.");
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 🛡️ Préserve la Canopée : 5 minutes de cache avant de re-fetcher en arrière-plan
    // Hydratation initiale si on est sur la page 1 sans filtres
    initialData: (selectedType === 'ALL' && selectedStyle === 'ALL' && currentPage === 1) 
      ? { data: initialData, pagination: { total: initialTotal, page: 1, limit: initialLimit, totalPages: Math.ceil(initialTotal / initialLimit) || 1 } }
      : undefined
  });

  const books = queryResponse?.data || [];
  const pagination = queryResponse?.pagination || { total: initialTotal, page: 1, limit: initialLimit, totalPages: 1 };

  // 🌀 Moteur de Sédimentation (Scriptorium -> Bibliotek)
  const fosterBookMutation = useMutation({
    mutationFn: async (payload: { title: string; content: string; writingType: string; style: string }) => {
      const blob = new Blob([payload.content], { type: 'text/plain;charset=utf-8' });
      const file = new File([blob], `${payload.title.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'manuscrit'}.txt`, { type: 'text/plain' });

      const formData = new FormData();
      formData.append('title', payload.title);
      formData.append('writingType', payload.writingType);
      formData.append('style', payload.style);
      formData.append('format', 'scriptorium');
      formData.append('status', 'DRAFT'); // 🟢 Les créations vont en brouillon par défaut !
      formData.append('file', file);
      formData.append('assetType', 'manuscript');
      
      const res = await fetch('/api/bibliotek', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec de la sédimentation.");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bibliotek-books'] });
      setIsScriptoriumOpen(false);
      toast.success(`✨ Brouillon sédimenté ! Retrouvez-le dans votre Studio.`);
    },
    onError: (err: any) => {
      toast.error(`🚨 Erreur de forge : ${err.message}`);
    }
  });

  const handleSaveScriptorium = async (formData: { title: string; content: string; writingType: string; style: string }) => {
    try {
      await fosterBookMutation.mutateAsync(formData);
    } catch {
      // Géré par onError
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-12 space-y-8 animate-in fade-in duration-500">
      
      {/* En-tête de la page */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-[#E5484D]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-[#E5484D]/10 border border-[#E5484D]/30 rounded-full text-[10px] font-black text-[#E5484D] uppercase tracking-widest flex items-center gap-1.5">
              <Feather size={12} /> Scriptorium & Liseuse
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white">
            Bibliotek
          </h1>
          <p className="text-xs font-mono text-slate-400 max-w-xl">
            Le sanctuaire des écrits libres. Rédige tes manuscrits, protège ton antériorité par hachage cryptographique et lis en toute sérénité.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 z-10">
          <Link
            href="/bibliotek/studio"
            className="px-6 py-4 bg-white/5 hover:bg-white/10 text-white font-black uppercase text-xs rounded-2xl border border-white/10 hover:border-white/20 transition-all flex items-center gap-2"
          >
            <LayoutDashboard size={16} /> Mon Studio
          </Link>
          <button
            onClick={() => setIsScriptoriumOpen(true)}
            className="px-6 py-4 bg-[#E5484D] hover:bg-[#c43d41] text-white font-black uppercase text-xs rounded-2xl shadow-[0_0_20px_rgba(229,72,77,0.3)] hover:scale-[1.02] transition-all flex items-center gap-2"
          >
            <Plus size={16} /> Écrire
          </button>
        </div>
      </div>

      <OracleVerifierWidget />

      {/* Filtres de navigation */}
      <div className="flex flex-wrap items-center gap-4 bg-black/30 p-4 border border-white/5 rounded-2xl">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mr-4">
          <Filter size={14} /> Filtrer les flux :
        </div>
        
        <select
          value={selectedType}
          onChange={(e) => { setSelectedType(e.target.value); setCurrentPage(1); }}
          className="bg-black/60 border border-white/10 px-3 py-2 rounded-xl text-xs text-white outline-none focus:border-[#E5484D]"
        >
          <option value="ALL">Tous les types d'écrits</option>
          <option value="roman">Roman</option>
          <option value="essai">Essai</option>
          <option value="poesie">Poésie</option>
          <option value="manifeste">Manifeste</option>
        </select>

        <select
          value={selectedStyle}
          onChange={(e) => { setSelectedStyle(e.target.value); setCurrentPage(1); }}
          className="bg-black/60 border border-white/10 px-3 py-2 rounded-xl text-xs text-white outline-none focus:border-[#E5484D]"
        >
          <option value="ALL">Tous les styles</option>
          <option value="philosophie">Philosophie</option>
          <option value="science-fiction">Science-Fiction</option>
          <option value="cyberpunk">Cyberpunk</option>
        </select>
      </div>

      {/* Grille des Ouvrages */}
      {isLoading && books.length === 0 ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#E5484D]" />
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {books.map((book: any) => (
              <div
                key={book.uid}
                className="p-6 bg-black/30 border border-white/5 rounded-3xl backdrop-blur-md flex flex-col justify-between space-y-6 hover:border-white/20 transition-all group shadow-lg relative"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest bg-[#E5484D]/10 text-[#E5484D] border border-[#E5484D]/20">
                      {book.writingType || 'Livre'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      {book.style || 'Général'}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-black uppercase text-white group-hover:text-[#E5484D] transition-colors line-clamp-1">
                    {book.title}
                  </h3>
                  
                  <p className="text-[10px] font-mono text-slate-500 truncate">
                    Sceau : {book.digitalSignature ? `${book.digitalSignature.substring(0, 20)}...` : 'Non scellé'}
                  </p>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                    <ShieldCheck size={12} className="text-emerald-400" /> Protégé
                  </span>
                  
                  <Link
                    href={`/bibliotek/${book.slug || book.uid}`}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-mono text-[10px] uppercase font-bold rounded-xl border border-white/10 transition-all"
                  >
                    Lire 📖
                  </Link>
                </div>
              </div>
            ))}

            {books.length === 0 && (
              <div className="col-span-full py-20 text-center space-y-4 bg-black/20 border border-white/5 rounded-3xl">
                <Compass className="w-10 h-10 mx-auto text-slate-600" />
                <p className="text-xs font-mono uppercase tracking-widest text-slate-500">
                  Aucun ouvrage trouvé pour cette fréquence.
                </p>
              </div>
            )}
          </div>

          {/* 📄 Contrôles de Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between bg-black/30 p-4 border border-white/5 rounded-2xl font-mono text-xs text-slate-400">
              <span>Page {pagination.page} sur {pagination.totalPages} ({pagination.total} œuvres)</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl disabled:opacity-30 text-white flex items-center gap-1 transition-all"
                >
                  <ChevronLeft size={14} /> Précédent
                </button>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl disabled:opacity-30 text-white flex items-center gap-1 transition-all"
                >
                  Suivant <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modale du Scriptorium */}
      {isScriptoriumOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-2xl p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-[#0A0D14] border border-white/10 rounded-3xl shadow-2xl relative my-8">
            <button
              onClick={() => setIsScriptoriumOpen(false)}
              className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors z-20 p-2 bg-white/5 rounded-full"
            >
              <X size={20} />
            </button>
            <ScriptoriumEditor onSave={handleSaveScriptorium} />
          </div>
        </div>
      )}

    </div>
  );
}