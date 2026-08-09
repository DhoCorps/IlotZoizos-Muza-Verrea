'use client';

import React, { useState, useEffect } from 'react';
import { SampleLibraryPanel } from '@/components/samplotek/SampleLibraryPanel';
import { SequencerGrid } from '@/components/samplotek/SequencerGrid';
import { SampleUploadModal } from '@/components/samplotek/SampleUploadModal';
import { useStudioStore } from '@/store/studioStore';
import { Disc, Radio, ArrowLeft, Sparkles, Upload } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function SamploTekPage() {
  const [samples, setSamples] = useState<any[]>([]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedTrackForSample, setSelectedTrackForSample] = useState<number | null>(null);
  
  const setTrackSample = useStudioStore((state) => state.setTrackSample);
  const tracks = useStudioStore((state) => state.tracks);

  // Charger la banque de sons depuis l'API de recherche
  const fetchSamples = async () => {
    try {
      const res = await fetch('/api/samples/search');
      const json = await res.json();
      if (json.success) {
        setSamples(json.data);
      }
    } catch (err) {
      console.error('Erreur chargement des samples :', err);
      toast.error('Impossible de charger la banque de sons.');
    }
  };

  useEffect(() => {
    fetchSamples();
  }, []);

  // Lorsqu'on clique sur un sample, on l'assigne à la première piste libre ou sélectionnée
  const handleSelectSample = (sample: any) => {
    // Si l'oiseau a ciblé une piste ou qu'on prend la première piste non verrouillée dispo
    const targetTrackId = selectedTrackForSample || tracks.find(t => !t.isLocked && !t.sampleUrl)?.id || 1;
    
    setTrackSample(targetTrackId, sample.audioUrl, sample.title);
    toast.success(`Sample "${sample.title}" assigné à la Piste 0${targetTrackId} ! 🎛️`);
    setSelectedTrackForSample(null);
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-950">
      
      {/* TOP NAVIGATION BAR */}
      <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link 
            href="/"
            className="flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-white transition-colors bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl"
          >
            <ArrowLeft size={14} /> Retour à l'Îlot
          </Link>
          <div className="h-4 w-[1px] bg-slate-800" />
          <div className="flex items-center gap-2">
            <Disc className="text-red-500 animate-pulse" size={20} />
            <h1 className="text-xs font-black uppercase tracking-widest text-slate-100">SamploTek • Studio E-Jay</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsUploadOpen(true)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-mono text-xs rounded-xl transition-all flex items-center gap-2"
          >
            <Upload size={14} /> Importer un Sample
          </button>
        </div>
      </header>

      {/* WORKSPACE PRINCIPAL (Split View : Bibliothèque Latérale + Séquencheur) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* PANNEAU LATÉRAL GAUCHE : BANQUE DE SONS */}
        <aside className="w-80 lg:w-96 shrink-0 h-full overflow-hidden flex flex-col">
          <SampleLibraryPanel 
            samples={samples}
            onSelectSample={handleSelectSample}
            onOpenUploadModal={() => setIsUploadOpen(true)}
          />
        </aside>

        {/* ZONE CENTRALE : SÉQUENCEUR ET MIXEUR */}
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col justify-center">
          <SequencerGrid />
        </main>
      </div>

      {/* MODALE D'IMPORT DE SAMPLES */}
      <SampleUploadModal 
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={fetchSamples}
      />

    </div>
  );
};