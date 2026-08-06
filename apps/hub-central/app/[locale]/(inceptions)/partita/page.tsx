// apps/hub-central/app/[locale]/(inceptions)/partita/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Music, Plus, Loader2, Sparkles, Compass } from 'lucide-react';
import { PartitaCard } from '../../../../components/partita/PartitaCard';
import { PartitaForm } from '../../../../components/partita/PartitaForm';
import ResonanceButton from '../../../../components/resonance/ResonanceButton'; // 🕸️ NOUVEAU : Le tisseur de liens

export default function PartitaDashboard() {
  const [partitions, setPartitions] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [instrumentFilter, setInstrumentFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPartition, setEditingPartition] = useState<any>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resPartitions, resProjects] = await Promise.all([
        fetch('/api/partitions'),
        fetch('/api/projects')
      ]);
      
      if (resPartitions.ok) {
        const data = await resPartitions.json();
        if (Array.isArray(data)) setPartitions(data);
      }
      
      if (resProjects.ok) {
        const data = await resProjects.json();
        const projList = Array.isArray(data) ? data : (data.data || []);
        setProjects(projList);
      }
    } catch (err) {
      console.error("🌊 Fracture lors de la synchronisation du catalogue Partita :", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (uid: string) => {
    if (!confirm("Es-tu sûr de vouloir dissoudre cette partition dans le néant ?")) return;
    try {
      const res = await fetch(`/api/partitions/${uid}`, { method: 'DELETE' });
      if (res.ok) {
        setPartitions(prev => prev.filter(p => p.uid !== uid));
      }
    } catch (err) {
      console.error("🔥 Erreur lors de la désintégration :", err);
    }
  };

  const handleOpenCreate = () => {
    setEditingPartition(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (partition: any) => {
    setEditingPartition(partition);
    setIsModalOpen(true);
  };

  const handleFormSuccess = () => {
    setIsModalOpen(false);
    setEditingPartition(null);
    fetchData();
  };

  const filteredPartitions = partitions.filter(p => {
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const matchesInstrument = instrumentFilter === 'ALL' || p.instrument === instrumentFilter;
    const matchesSearch = p.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.content?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesInstrument && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24 animate-in fade-in duration-500">
      
      {/* 🌌 EN-TÊTE DE LA PARTITIONNERIE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-[#E5484D]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-[#E5484D]/10 border border-[#E5484D]/30 rounded-full text-[10px] font-black text-[#E5484D] uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles size={12} /> Inception Partita
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white">
            La Partitionnerie
          </h1>
          <p className="text-xs font-mono text-slate-400 max-w-xl">
            Saisis tes grilles, tes tablatures et tes notations musicales. Relie tes partitions aux chantiers de l'Îlot et diffuse tes fréquences.
          </p>
        </div>

        <div className="flex items-center gap-4 z-10">
          <button 
            onClick={handleOpenCreate}
            className="px-6 py-4 bg-[#E5484D] hover:bg-[#c43d41] text-white font-black uppercase text-xs rounded-2xl shadow-[0_0_20px_rgba(229,72,77,0.3)] hover:scale-[1.02] transition-all flex items-center gap-2"
          >
            <Plus size={16} /> Nouvelle Partition
          </button>
        </div>
      </div>

      {/* 🎛️ FILTRES & RECHERCHE */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          
          {/* Filtres par statut */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 custom-scrollbar">
            {['ALL', 'DRAFT', 'PUBLISHED', 'ARCHIVED'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${
                  statusFilter === status 
                    ? 'bg-white text-black shadow-lg' 
                    : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                {status === 'ALL' ? 'Tous les Statuts' : status === 'DRAFT' ? 'Brouillons' : status === 'PUBLISHED' ? 'Publiés' : 'Archivés'}
              </button>
            ))}
          </div>

          {/* Recherche */}
          <div className="relative w-full sm:w-72">
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher une note, une tab..."
              className="w-full bg-black/40 border border-white/10 px-4 py-2.5 rounded-xl text-xs text-white outline-none focus:border-[#E5484D] font-mono"
            />
          </div>
        </div>

        {/* Filtres par Instrument */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          <span className="text-[9px] font-mono uppercase text-slate-500 mr-2 shrink-0">Instruments :</span>
          {['ALL', 'BASS', 'GUITAR', 'PIANO', 'DRUMS', 'VOCAL', 'OTHER'].map((inst) => (
            <button
              key={inst}
              onClick={() => setInstrumentFilter(inst)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-wider transition-all shrink-0 ${
                instrumentFilter === inst 
                  ? 'bg-[#E5484D] text-white font-bold' 
                  : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10 hover:text-white'
              }`}
            >
              {inst === 'ALL' ? 'Tous' : inst}
            </button>
          ))}
        </div>
      </div>

      {/* 📜 LISTE DES PARTITIONS (GRILLE) */}
      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#E5484D]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPartitions.map((partition: any) => {
            const partitionId = partition.uid || partition._id;
            const authorSlug = partition.authorSlug || partition.ownerUid || 'createur-inconnu';

            return (
              <div key={partitionId} className="relative group">
                {/* 🕸️ Bouton de Résonance granulaire positionné en surbrillance sur la carte */}
                <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <ResonanceButton 
                    targetSlug={authorSlug}
                    type="FOLLOWS_SPECIFIC"
                    entityId={partitionId}
                    variant="icon"
                    initialIsFollowing={partition.isFollowedByMe}
                  />
                </div>

                <PartitaCard 
                  partition={partition}
                  onEdit={handleOpenEdit}
                  onDelete={handleDelete}
                />
              </div>
            );
          })}

          {filteredPartitions.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-4 bg-black/20 border border-white/5 rounded-3xl">
              <Compass className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-xs font-mono uppercase tracking-widest text-slate-500">
                Aucune partition ne résonne sur cette fréquence dans l'Atelier.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 🪟 MODALE DE CRÉATION / MUTATION */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in">
          <div className="w-full max-w-2xl bg-[#0A0D14] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl relative space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Music size={16} className="text-[#E5484D]" /> 
                {editingPartition ? "Ajuster la Partition" : "Inscrire une Partition"}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-xs font-mono text-slate-500 hover:text-white uppercase transition-colors"
              >
                [ Fermer ]
              </button>
            </div>

            <PartitaForm 
              initialData={editingPartition}
              existingProjects={projects}
              onSuccess={handleFormSuccess}
              onCancel={() => setIsModalOpen(false)}
            />
          </div>
        </div>
      )}

    </div>
  );
}