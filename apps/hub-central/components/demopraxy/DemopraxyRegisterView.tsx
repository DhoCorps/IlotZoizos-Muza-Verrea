// apps/hub-central/components/demopraxy/DemopraxyRegisterView.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

// 🛡️ Interfaces locales
interface DemopraxicRecord {
  uid: string;
  userIdentifier: string;
  actorUid: string;
  metrics: {
    computedEx: number;
    systemicHatredScore: number;
    recurrenceCount: number;
  };
  sanctionCategory: string;
  tags: string[];
  isExcluded: boolean;
  actionMessage: string;
  createdAt: string;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function DemopraxyRegisterView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [records, setRecords] = useState<DemopraxicRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 🎛️ Lecture dynamique depuis l'URL (Le vrai pouvoir du SSR / URL State)
  const filterCategory = searchParams.get('sanctionCategory') || 'ALL';
  const filterTag = searchParams.get('tag') || '';
  const filterExcluded = searchParams.get('isExcluded') || 'ALL';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // État local uniquement pour l'input texte afin de fluidifier la frappe avant le debounce
  const [localTag, setLocalTag] = useState<string>(filterTag);

  // 🔄 Mise à jour centralisée de l'URL
  const updateUrl = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'ALL') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    if (key !== 'page') params.set('page', '1'); // Retour à la page 1 si on change un filtre
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, pathname, router]);

  const fetchRegister = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const apiParams = new URLSearchParams();
      apiParams.append('page', currentPage.toString());
      apiParams.append('limit', '10');

      if (filterCategory !== 'ALL') apiParams.append('sanctionCategory', filterCategory);
      if (filterTag.trim()) apiParams.append('tag', filterTag.trim());
      if (filterExcluded !== 'ALL') apiParams.append('isExcluded', filterExcluded === 'TRUE' ? 'true' : 'false');

      const res = await fetch(`/api/demopraxy/register?${apiParams.toString()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Erreur lors de la lecture du registre.");
      
      if (data.success) {
        setRecords(data.data || []);
        setPagination(data.pagination);
      } else {
        throw new Error(data.error || "Erreur inconnue");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterCategory, filterTag, filterExcluded]);

  // 📡 Le fetch est désormais totalement piloté par les changements d'URL
  useEffect(() => {
    fetchRegister();
  }, [fetchRegister]);

  // ⏱️ Debounce optimisé : on utilise directement updateUrl pour synchroniser le tag
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (localTag !== filterTag) {
        updateUrl('tag', localTag.trim());
      }
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [localTag, filterTag, updateUrl]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      updateUrl('page', newPage.toString());
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 rounded-xl bg-slate-950 border border-slate-800 shadow-2xl text-slate-200">
      <div className="flex items-center gap-3 mb-8 border-b border-slate-800 pb-4">
        <span className="text-3xl">⚖️</span>
        <div>
          <h2 className="text-2xl font-bold tracking-wider text-slate-100 uppercase">Registre de Justice</h2>
          <p className="text-sm text-slate-400 font-mono mt-1">Historique public des stases et évaluations démopraxiques de l'Îlot</p>
        </div>
      </div>

      {/* 🎛️ Panneau de Filtrage Souverain */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 bg-slate-900 p-4 rounded-lg border border-slate-700/50">
        <div>
          <label htmlFor="filter-category" className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Catégorie</label>
          <select 
            id="filter-category"
            value={filterCategory} 
            onChange={(e) => updateUrl('sanctionCategory', e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 rounded border border-slate-700 text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">Toutes les Dérives</option>
            <option value="SYSTEMIC_HATRED">Haine Systémique</option>
            <option value="MANIPULATION">Manipulation</option>
            <option value="TOXICITY">Toxicité Comportementale</option>
            <option value="HARASSMENT">Harcèlement</option>
            <option value="DISINFORMATION">Désinformation</option>
            <option value="CUSTOM">Personnalisée / Autre</option>
          </select>
        </div>
        <div>
          <label htmlFor="filter-tag" className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Recherche par Tag</label>
          <input 
            id="filter-tag"
            type="text" 
            value={localTag} 
            onChange={(e) => setLocalTag(e.target.value)}
            placeholder="ex: toxique, avertissement..."
            className="w-full px-3 py-2 bg-slate-950 rounded border border-slate-700 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="filter-status" className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Statut du Jugement</label>
          <select 
            id="filter-status"
            value={filterExcluded} 
            onChange={(e) => updateUrl('isExcluded', e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 rounded border border-slate-700 text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="TRUE">Exclusion (Stase)</option>
            <option value="FALSE">Avertissement Simple</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-950/40 border border-red-900 text-red-200 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* 📜 Liste des Enregistrements */}
      <div className="space-y-4 min-h-[300px]">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <span className="text-slate-500 animate-pulse font-mono text-sm">Consultation de la Matrice...</span>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center p-8 bg-slate-900/50 rounded-lg border border-dashed border-slate-800 text-slate-500">
            Aucun enregistrement démopraxique trouvé pour ces critères.
          </div>
        ) : (
          records.map((record) => (
            <div key={record.uid} className="p-4 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex flex-col md:flex-row gap-4">
              {/* Statut & Identité */}
              <div className="flex-shrink-0 w-32 flex flex-col gap-2">
                <span className={`px-2 py-1 rounded text-center text-[10px] uppercase font-bold tracking-wider ${record.isExcluded ? 'bg-red-950/80 text-red-400 border border-red-900/50' : 'bg-emerald-950/80 text-emerald-400 border border-emerald-900/50'}`}>
                  {record.isExcluded ? 'Stase' : 'Avertissement'}
                </span>
                <span className="text-xs font-mono text-slate-400 break-all text-center">
                  Cible:<br/> <span className="text-indigo-300">@{record.userIdentifier}</span>
                </span>
              </div>

              {/* Détails du Jugement */}
              <div className="flex-grow">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-semibold text-slate-200">{record.sanctionCategory.replace('_', ' ')}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{new Date(record.createdAt).toLocaleDateString('fr-FR')}</span>
                </div>
                <p className="text-xs text-slate-400 mb-3 border-l-2 border-slate-700 pl-3 italic">
                  "{record.actionMessage}"
                </p>
                
                {/* Métriques & Tags */}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[10px] font-mono bg-slate-950 px-2 py-1 rounded border border-slate-800 text-amber-500/80">
                    Ex: {record.metrics.computedEx.toFixed(2)}
                  </span>
                  {record.tags.map(tag => (
                    <span key={tag} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 🧭 Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className="mt-8 pt-4 border-t border-slate-800 flex justify-between items-center text-sm font-mono">
          <button 
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 rounded border border-slate-700 transition"
          >
            &lt; Précédent
          </button>
          <span className="text-slate-400">
            Page <span className="text-slate-200 font-bold">{pagination.page}</span> / {pagination.totalPages}
          </span>
          <button 
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 rounded border border-slate-700 transition"
          >
            Suivant &gt;
          </button>
        </div>
      )}
    </div>
  );
}