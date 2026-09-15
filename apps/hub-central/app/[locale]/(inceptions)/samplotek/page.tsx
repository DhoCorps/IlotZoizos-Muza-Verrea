'use client';

import React, { useState, useEffect } from 'react';
import { SampleLibraryPanel } from '@/components/samplotek/SampleLibraryPanel';
import { SequencerGrid } from '@/components/samplotek/SequencerGrid';
import { SampleUploadModal } from '@/components/samplotek/SampleUploadModal';
import { useStudioStore } from '@/store/studioStore';
import { Disc, ArrowLeft, Upload, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function SamploTekPage() {
  const [samples, setSamples] = useState<any[]>([]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedTrackForSample, setSelectedTrackForSample] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  const { setTrackSample, tracks, bpm } = useStudioStore();

  // 1. Charger la banque de sons depuis l'API de recherche (mise en cache)
  const fetchSamples = async () => {
    try {
      const res = await fetch('/api/samplotek/search');
      const json = await res.json();
      if (json.success) {
        setSamples(json.data);
      }
    } catch (err) {
      console.error('Erreur chargement des samples :', err);
      toast.error('Impossible de charger la banque de sons depuis la Silice.');
    }
  };

  useEffect(() => {
    fetchSamples();
  }, []);

  // 2. Assigner un sample du panneau latéral vers le Séquenceur
  const handleSelectSample = (sample: any) => {
    // On trouve la première piste non verrouillée qui n'a pas encore de sample assigné
    const targetTrackId = selectedTrackForSample || tracks.find((t: any) => !t.isLocked && !t.sampleUrl)?.id || 1;
    
    // Assigner l'URL et le nom à la piste pour permettre le séquençage
    setTrackSample(targetTrackId, sample.audioUrl, sample.title);
    toast.success(`Brindille sonore "${sample.title}" greffée à la Piste 0${targetTrackId} ! 🎛️`);
    setSelectedTrackForSample(null);
  };

  // 3. Nettoyage instantané de l'état local suite à la dissolution d'un sample
  const handleSampleDeleted = (deletedIdentifier: string) => {
    setSamples((prevSamples) => 
      prevSamples.filter(s => s.uid !== deletedIdentifier && s.slug !== deletedIdentifier)
    );
  };

  // 4. Exporter le projet via l'Orchestrateur (Sceau et Neo4j)
  const handleExportProject = async () => {
    const activeTracks = tracks.filter((t: any) => !t.isLocked && t.sampleUrl);
    
    if (activeTracks.length === 0) {
      toast.error("Le studio est silencieux. Assigne au moins un sample avant de graver l'œuvre.");
      return;
    }

    const projectTitle = prompt("Donne un nom à ton œuvre rythmique :");
    if (!projectTitle) return;

    setIsExporting(true);
    try {
      const payload = {
        title: projectTitle,
        bpm: bpm,
        tracks: activeTracks.map((t: any) => ({
          id: t.id,
          sampleUid: samples.find(s => s.audioUrl === t.sampleUrl)?.uid || 'unknown',
          volume: t.volume,
          isMuted: t.isMuted,
          steps: t.steps // On exporte bien la grille rythmique !
        }))
      };

      const res = await fetch('/api/samplotek/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Échec du mixage.");

      toast.success("Œuvre SamploTek mixée, sédimentée et scellée avec succès dans l'Îlot ! 💿");
    } catch (err: any) {
      toast.error(err.message || 'Impossible de sceller le projet dans le Nexus.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-950">
      
      {/* TOP NAVIGATION BAR */}
      <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-10 relative">
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
            <h1 className="text-xs font-black uppercase tracking-widest text-slate-100 hidden sm:block">SamploTek • Studio E-Jay</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsUploadOpen(true)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-mono text-xs rounded-xl transition-all flex items-center gap-2"
          >
            <Upload size={14} /> Importer
          </button>
          <button 
            onClick={handleExportProject}
            disabled={isExporting}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold uppercase tracking-widest text-[10px] rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all flex items-center gap-2"
          >
            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isExporting ? 'Mixage...' : 'Graver l\'Œuvre'}
          </button>
        </div>
      </header>

      {/* WORKSPACE PRINCIPAL (Split View : Bibliothèque Latérale + Séquencheur) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* PANNEAU LATÉRAL GAUCHE : BANQUE DE SONS */}
        <aside className="w-80 lg:w-96 shrink-0 h-full overflow-hidden flex flex-col z-10 relative shadow-2xl">
          <SampleLibraryPanel 
            samples={samples}
            onSelectSample={handleSelectSample}
            onOpenUploadModal={() => setIsUploadOpen(true)}
            onSampleDeleted={handleSampleDeleted}
          />
        </aside>

        {/* ZONE CENTRALE : SÉQUENCEUR ET MIXEUR */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col justify-center">
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
}