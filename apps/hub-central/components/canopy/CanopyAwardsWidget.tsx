'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

interface AwardItem {
  awardKey: string;
  title: string;
  recipientUid: string;
  category: 'GLORY' | 'CHAOS' | 'MYSTIC' | 'CUSTOM';
  loreDescription?: string;
  yearMonth: string;
}

export default function CanopyAwardsWidget() {
  const [isOpen, setIsOpen] = useState(false);
  
  // 🌟 État local pour suivre les louanges célébrées de manière optimiste
  const [celebratedMap, setCelebratedMap] = useState<Record<string, boolean>>({});

  // 🌿 1. Fetch conditionnel et mis en cache (TanStack Query)
  const { data: awards = [], isLoading } = useQuery<AwardItem[]>({
    queryKey: ['canopy-awards'],
    queryFn: async () => {
      const res = await fetch('/api/canopy/awards');
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error("Erreur de chargement");
      return data.awards;
    },
    enabled: isOpen, // Le fetch ne s'exécute que si le tiroir est ouvert !
    staleTime: 1000 * 60 * 10, // Cache de 10 minutes pour éviter le spam réseau
  });

  // ✨ 2. Mutation pour transmettre des louanges (Praises) avec Optimistic Update
  const praiseMutation = useMutation({
    mutationFn: async (award: AwardItem) => {
      const res = await fetch('/api/praises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUid: award.recipientUid,
          reason: `Félicitations pour le trophée de la Canopée : ${award.title} !`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "La matrice a rejeté tes louanges.");
      return data;
    },
    onMutate: (award: AwardItem) => {
      const awardId = award.awardKey + award.yearMonth;
      // Mise à jour optimiste immédiate de l'interface
      setCelebratedMap(prev => ({ ...prev, [awardId]: true }));
    },
    onError: (err: Error, award: AwardItem) => {
      const awardId = award.awardKey + award.yearMonth;
      // Rollback en cas d'erreur de la matrice
      setCelebratedMap(prev => ({ ...prev, [awardId]: false }));
      toast.error(`⚠️ ${err.message}`);
    },
    onSuccess: () => {
      toast.success("✨ Louanges propagées dans la Canopée avec succès !");
    }
  });

  return (
    <div className="relative">
      {/* Bouton Réduit (Badge Flottant) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900/90 hover:bg-slate-800 text-amber-400 rounded-full border border-amber-500/30 shadow-xl backdrop-blur-md transition-all hover:scale-105 group"
          title="Ouvrir le Panthéon de la Canopée"
        >
          <span className="text-lg">🏆</span>
          <span className="text-xs font-mono font-semibold tracking-wider text-gray-200 group-hover:text-amber-300">
            Panthéon
          </span>
        </button>
      )}

      {/* Panneau Développé (Modale / Tiroir) */}
      {isOpen && (
        <div className="absolute bottom-0 right-0 w-80 sm:w-96 max-h-[80vh] flex flex-col bg-slate-950/95 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200 z-50">
          {/* En-tête */}
          <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏆</span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Panthéon de la Canopée</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Contenu Liste */}
          <div className="p-4 overflow-y-auto space-y-3 custom-scrollbar flex-1">
            {isLoading ? (
              <div className="py-12 text-center text-xs text-gray-400 animate-pulse">
                ✨ Consultation des archives du ciel...
              </div>
            ) : awards.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-500 px-4 border border-dashed border-slate-800 rounded-xl">
                Aucun trophée scellé pour l'instant. Le vent souffle encore en silence.
              </div>
            ) : (
              awards.map((award) => {
                const awardId = award.awardKey + award.yearMonth;
                const isCelebrated = celebratedMap[awardId];

                return (
                  <div
                    key={awardId}
                    className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition-all relative overflow-hidden group"
                  >
                    {/* Badge de Catégorie */}
                    <div className="absolute top-0 right-0 px-2.5 py-0.5 text-[10px] font-mono tracking-wider bg-slate-800/90 text-amber-400 rounded-bl-lg border-l border-b border-slate-700">
                      {award.category}
                    </div>

                    <span className="text-[11px] font-semibold text-indigo-400">{award.yearMonth}</span>
                    <h4 className="text-sm font-bold text-white mt-0.5 mb-1">{award.title}</h4>
                    
                    {award.loreDescription && (
                      <p className="text-xs text-gray-300 italic mb-3">&ldquo;{award.loreDescription}&rdquo;</p>
                    )}

                    <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-800/80 text-gray-400">
                      <div className="flex flex-col gap-1">
                        <span>Lauréat :</span>
                        <span className="font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/30">
                          {award.recipientUid}
                        </span>
                      </div>

                      {/* ✨ Bouton d'interaction optimiste pour la résonance */}
                      <button
                        onClick={() => praiseMutation.mutate(award)}
                        disabled={isCelebrated || praiseMutation.isPending}
                        className={`mt-2 border px-3 py-1.5 rounded transition-all flex items-center gap-1.5 ${
                          isCelebrated
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50 cursor-default'
                            : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700'
                        }`}
                      >
                        <span>{isCelebrated ? 'Célébré' : 'Féliciter'}</span>
                        <span>{isCelebrated ? '🌟' : '👏'}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}