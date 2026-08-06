// apps/hub-central/app/[locale]/(inceptions)/abyss-blog/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Link } from '../../../../navigation';
import { 
  Type, Plus, Trash2, Edit3, BookOpen, Loader2, 
  Layers, Filter, Sparkles, FolderPlus, Compass 
} from 'lucide-react';
import { SujetForm } from '../../../../components/abyss-blog/sujets/SujetForm';
import ResonanceButton from '../../../../components/resonance/ResonanceButton'; // 🕸️ NOUVEAU : Import du Bouton de Résonance

export default function AbyssBlogDashboard() {
  const [sujets, setSujets] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSujet, setEditingSujet] = useState<any>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resSujets, resProjects] = await Promise.all([
        fetch('/api/sujets'),
        fetch('/api/projects')
      ]);
      
      if (resSujets.ok) {
        const data = await resSujets.json();
        const sujetList = Array.isArray(data) ? data : (data.data || data.sujets || []);
        setSujets(sujetList);
      }
      
      if (resProjects.ok) {
        const data = await resProjects.json();
        const projList = Array.isArray(data) ? data : (data.data || data.projects || []);
        setProjects(projList);
      }
    } catch (err) {
      console.error("🌊 Fracture lors de la synchronisation de l'Atelier :", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (uid: string) => {
    if (!confirm("Es-tu sûr de vouloir dissoudre ce monologue dans le néant ?")) return;
    try {
      const res = await fetch(`/api/sujets/${uid}`, { method: 'DELETE' });
      if (res.ok) {
        setSujets(prev => prev.filter(s => s.uid !== uid && s._id !== uid));
      }
    } catch (err) {
      console.error("🔥 Erreur lors de la désintégration :", err);
    }
  };

  const handleOpenCreate = () => {
    setEditingSujet(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sujet: any) => {
    setEditingSujet(sujet);
    setIsModalOpen(true);
  };

  const handleFormSuccess = () => {
    setIsModalOpen(false);
    setEditingSujet(null);
    fetchData();
  };

  const filteredSujets = sujets.filter(s => {
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch = s.title?.toLowerCase().includes(term) || 
                          s.content?.toLowerCase().includes(term) ||
                          s.category?.toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24 animate-in fade-in duration-500">
      
      {/* 🌌 EN-TÊTE DE L'ATELIER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-[#E5484D]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-[#E5484D]/10 border border-[#E5484D]/30 rounded-full text-[10px] font-black text-[#E5484D] uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles size={12} /> L'Atelier d'AbyssBlog
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white">
            La Forge des Monologues
          </h1>
          <p className="text-xs font-mono text-slate-400 max-w-xl">
            Rédige, tisse et sédimente tes pensées. Lie tes textes aux chantiers de l'Îlot et diffuse tes fréquences audio à travers la matrice.
          </p>
        </div>

        <div className="flex items-center gap-4 z-10">
          <button 
            onClick={handleOpenCreate}
            className="px-6 py-4 bg-[#E5484D] hover:bg-[#c43d41] text-white font-black uppercase text-xs rounded-2xl shadow-[0_0_20px_rgba(229,72,77,0.3)] hover:scale-[1.02] transition-all flex items-center gap-2"
          >
            <Plus size={16} /> Nouveau Monologue
          </button>
        </div>
      </div>

      {/* 🎛️ FILTRES & RECHERCHE */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
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
              {status === 'ALL' ? 'Tous les Textes' : status === 'DRAFT' ? 'Brouillons' : status === 'PUBLISHED' ? 'Publiés' : 'Archivés'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher dans la matrice..."
            className="w-full bg-black/40 border border-white/10 px-4 py-2.5 rounded-xl text-xs text-white outline-none focus:border-[#E5484D] font-mono"
          />
        </div>
      </div>

      {/* 📜 LISTE DES SUJETS (GRILLE) */}
      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#E5484D]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSujets.map((sujet: any) => {
            const sujetKey = sujet.uid || sujet._id;
            // On récupère le slug de l'auteur s'il est peuplé par l'API, sinon on met un fallback
            const targetSlug = sujet.authorSlug || sujet.authorUid || 'dho';

            return (
              <div 
                key={sujetKey} 
                className="p-6 bg-black/30 border border-white/5 rounded-3xl backdrop-blur-md flex flex-col justify-between space-y-6 hover:border-white/20 transition-all group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${
                      sujet.status === 'PUBLISHED' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : sujet.status === 'ARCHIVED'
                        ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {sujet.status || 'DRAFT'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {sujet.category || 'Général'}
                    </span>
                  </div>

                  <h3 className="text-lg font-black uppercase text-white group-hover:text-[#E5484D] transition-colors line-clamp-1">
                    {sujet.title}
                  </h3>

                  <p className="text-xs text-slate-400 font-sans line-clamp-3 leading-relaxed">
                    {sujet.content}
                  </p>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                  {sujet.connections?.relatedProjects?.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                      <Layers size={12} className="text-[#E5484D]" />
                      <span>{sujet.connections.relatedProjects.length} chantier(s) relié(s)</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <Link 
                      href={{
                        pathname: '/abyss-blog/[slug]',
                        params: { slug: sujet.slug || sujetKey }
                      }}
                      className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white font-mono text-[10px] uppercase font-bold rounded-xl border border-white/10 text-center transition-all flex items-center justify-center gap-1.5"
                    >
                      <BookOpen size={12} /> Lire
                    </Link>

                    {/* 🕸️ INTÉGRATION DU BOUTON DE RÉSONANCE (Granulaire) */}
                    <ResonanceButton 
                      targetSlug={targetSlug}
                      type="FOLLOWS_SPECIFIC"
                      entityId={sujetKey}
                      variant="icon"
                      initialIsFollowing={sujet.isFollowedByMe} // Si géré plus tard par l'API
                    />

                    <button 
                      onClick={() => handleOpenEdit(sujet)}
                      className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl border border-white/10 transition-all"
                      title="Ajuster"
                    >
                      <Edit3 size={14} />
                    </button>

                    <button 
                      onClick={() => handleDelete(sujetKey)}
                      className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 transition-all"
                      title="Dissoudre"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredSujets.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-4 bg-black/20 border border-white/5 rounded-3xl">
              <Compass className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-xs font-mono uppercase tracking-widest text-slate-500">
                Aucun monologue ne correspond à cette fréquence dans l'Atelier.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 🪟 MODALE DE CRÉATION / MUTATION (SujetForm) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in">
          <div className="w-full max-w-2xl bg-[#0A0D14] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl relative space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Type size={16} className="text-[#E5484D]" /> 
                {editingSujet ? "Ajuster le Monologue" : "Inscrire un Nouveau Monologue"}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-xs font-mono text-slate-500 hover:text-white uppercase transition-colors"
              >
                [ Fermer ]
              </button>
            </div>

            <SujetForm 
              initialData={editingSujet}
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