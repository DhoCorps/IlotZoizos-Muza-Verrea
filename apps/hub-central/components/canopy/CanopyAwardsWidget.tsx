'use client';

import React, { useEffect, useState } from 'react';

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
  const [awards, setAwards] = useState<AwardItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && awards.length === 0) {
      async function fetchAwards() {
        setLoading(true);
        try {
          const res = await fetch('/api/canopy/awards');
          const data = await res.json();
          if (data.success) {
            setAwards(data.awards);
          }
        } catch (err) {
          console.error("🔥 Erreur chargement trophées :", err);
        } finally {
          setLoading(false);
        }
      }
      fetchAwards();
    }
  }, [isOpen, awards.length]);

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
            {loading ? (
              <div className="py-12 text-center text-xs text-gray-400 animate-pulse">
                ✨ Consultation des archives du ciel...
              </div>
            ) : awards.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-500 px-4 border border-dashed border-slate-800 rounded-xl">
                Aucun trophée scellé pour l'instant. Le vent souffle encore en silence.
              </div>
            ) : (
              awards.map((award) => (
                <div
                  key={award.awardKey + award.yearMonth}
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
                    <span>Lauréat :</span>
                    <span className="font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/30">
                      {award.recipientUid}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}