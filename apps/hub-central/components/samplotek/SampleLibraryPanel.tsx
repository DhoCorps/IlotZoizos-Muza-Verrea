// apps/hub-central/components/samplotek/SampleLibraryPanel.tsx
'use client';

import React, { useState } from 'react';
import { Search, Disc, Play, Plus, ShieldCheck, Trash2, Loader2 } from 'lucide-react';
import { useSampleFilter } from '../../hooks/useSampleFilter';
import { toast } from 'sonner';

interface SampleLibraryPanelProps {
  samples: any[];
  onSelectSample: (sample: any) => void;
  onOpenUploadModal: () => void;
  onSampleDeleted?: (sampleUidOrSlug: string) => void; // 🔄 Callback optionnel pour rafraîchir la liste parente
}

export const SampleLibraryPanel: React.FC<SampleLibraryPanelProps> = ({ 
  samples, 
  onSelectSample, 
  onOpenUploadModal,
  onSampleDeleted 
}) => {
  const { searchQuery, setSearchQuery, filteredSamples } = useSampleFilter(samples);
  const [deletingUid, setDeletingUid] = useState<string | null>(null);

  // 🗑️ Gestion de la dissolution / suppression d'un sample
  const handleDeleteSample = async (e: React.MouseEvent, sample: any) => {
    e.stopPropagation(); // Évite de déclencher la sélection du sample au clic sur la corbeille
    
    const identifier = sample.slug || sample.uid;
    if (!identifier) return;

    if (!confirm(`Es-tu sûr de vouloir dissoudre et réduire en cendres le sample "${sample.title}" ?`)) {
      return;
    }

    setDeletingUid(sample.uid);
    try {
      const res = await fetch(`/api/samplotek/${identifier}`, {
        method: 'DELETE',
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Échec de la dissolution du sample.");
      }

      toast.success(json.message || "Sample purgé avec succès !");
      
      // On déclenche le callback parent pour mettre à jour l'affichage instantanément
      if (onSampleDeleted) {
        onSampleDeleted(identifier);
      }
    } catch (err: any) {
      toast.error(err.message || "Impossible de purger ce sample de la matrice.");
    } finally {
      setDeletingUid(null);
    }
  };

  return (
    <div className="w-full h-full bg-slate-950 border-r border-slate-800 flex flex-col p-4 space-y-4 text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Disc className="text-red-500 animate-spin duration-[8000ms]" size={18} />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">Banque de Sons</h3>
        </div>
        <button 
          onClick={onOpenUploadModal}
          className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold uppercase text-[10px] tracking-wider rounded-xl transition-all shadow-lg flex items-center gap-1 cursor-pointer"
        >
          <Plus size={14} /> Graver
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 text-slate-500" size={14} />
        <input 
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher un sample..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-red-500 transition-colors"
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {filteredSamples.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs font-mono">
            Aucun sample trouvé dans la Canopée
          </div>
        ) : (
          filteredSamples.map((sample) => {
            const isDeleting = deletingUid === sample.uid;
            return (
              <div 
                key={sample.uid || sample._id}
                className="group p-3 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-red-500/40 rounded-2xl transition-all flex items-center justify-between shadow-sm cursor-pointer"
                onClick={() => onSelectSample(sample)}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-100 group-hover:text-red-400 transition-colors">{sample.title}</h4>
                    {sample.digitalSignature && (
                      <span title="Sceau cryptographique validé" className="flex items-center">
                        <ShieldCheck size={12} className="text-emerald-500" />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                    <span className="text-red-500 font-bold">{sample.tempoBpm} BPM</span>
                    <span>•</span>
                    <span>{sample.musicalKey}</span>
                    <span>•</span>
                    <span className="uppercase tracking-widest text-[9px] bg-slate-800 px-1.5 py-0.5 rounded">{sample.style}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Bouton de lecture */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); onSelectSample(sample); }}
                    className="w-8 h-8 rounded-xl bg-slate-800 group-hover:bg-red-600 text-slate-300 group-hover:text-white flex items-center justify-center transition-all shadow cursor-pointer"
                    title="Écouter le sample"
                  >
                    <Play size={14} />
                  </button>

                  {/* Bouton de suppression (Dissolution) */}
                  <button 
                    onClick={(e) => handleDeleteSample(e, sample)}
                    disabled={isDeleting}
                    className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-red-950 text-slate-500 hover:text-red-400 border border-slate-800 hover:border-red-900 flex items-center justify-center transition-all shadow cursor-pointer disabled:opacity-50"
                    title="Dissoudre / Supprimer le sample"
                  >
                    {isDeleting ? <Loader2 size={14} className="animate-spin text-red-500" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};