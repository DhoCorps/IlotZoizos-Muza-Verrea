'use client';

import { useState, useEffect } from 'react';
import { Loader2, Plus, Network, UserPlus, ShieldCheck, Trash2, X, BarChart3, Paperclip, AlertTriangle } from 'lucide-react';
// Importation des composants de chantiers (à adapter selon ton arborescence)
import { ProjectDashboard } from '../../../../components/projects/ProjectDashboard';
import { ProjectForm } from '../../../../components/projects/ProjectForm';

export default function TomHatToesHub() {
  // --- 🧊 ÉTATS DE LA SILICE ---
  const [inceptions, setInceptions] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeInceptionId, setActiveInceptionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'teams' | 'projects'>('teams');
  
  // --- 📡 ÉTATS DU RADAR ---
  const [searchBird, setSearchBird] = useState("");
  const [foundBirds, setFoundBirds] = useState<any[]>([]);
  const [isRecruiting, setIsRecruiting] = useState(false);

  // --- 🔄 SYNCHRONISATION TOTALE ---
  const refreshData = async () => {
    setLoading(true);
    try {
      // Suture simultanée des deux mondes [cite: 2026-03-09]
      const [teamsRes, projectsRes] = await Promise.all([
        fetch('/api/teams').then(res => res.json()),
        fetch('/api/projects').then(res => res.json())
      ]);
      
      setInceptions(Array.isArray(teamsRes) ? teamsRes : []);
      setProjects(Array.isArray(projectsRes) ? projectsRes : []);
    } catch (err) {
      console.error("🚨 Erreur Hub Sync:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refreshData(); }, []);

  // --- 🛰️ LOGIQUE RADAR & INVITATION ---
  const handleSearchBirds = async (val: string) => {
    setSearchBird(val);
    if (val.length < 2) return setFoundBirds([]);
    try {
      const res = await fetch(`/api/users/recruitable?search=${val}`).then(r => r.json());
      setFoundBirds(res);
    } catch (err) { console.error("Erreur radar", err); }
  };

  const inviteBirdToTeam = async (teamUid: string, userUid: string) => {
    setIsRecruiting(true);
    try {
      await fetch(`/api/teams/${teamUid}/members`, {
        method: 'POST',
        body: JSON.stringify({ userUid, action: 'INVITE' })
      });
      refreshData();
      setActiveInceptionId(null);
    } finally { setIsRecruiting(false); }
  };

  // --- 🏗️ FONDATION (TEAM OU PROJET) ---
  const handleCreateSuccess = () => {
    refreshData();
    setActiveInceptionId(null);
  };

  // Fondation de Nid (Team)
  const createNewTeam = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      description: formData.get('description'),
      category: 'SOCIAL',
      isPrivate: true
    };

    try {
      await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      handleCreateSuccess();
    } catch (err) { console.error("Erreur création nid", err); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#05070A]">
      <Loader2 className="w-10 h-10 animate-spin text-[#E5484D]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#05070A] text-slate-100 p-6 md:p-12">
      
      {/* 🏷️ HEADER BIO-TECH */}
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-[#E5484D]">
            Tom-Hat-Toes <span className="text-slate-800">/</span> Hub
          </h1>
          <p className="text-slate-500 font-mono text-[10px] uppercase tracking-[0.3em] mt-2">
            Architecture des Escouades & Chantiers
          </p>
        </div>

        <button 
          onClick={() => setActiveInceptionId('global')}
          className="px-6 py-4 bg-[#E5484D]/10 border border-[#E5484D]/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#E5484D]/20 transition-all flex items-center gap-3 group text-[#E5484D]"
        >
          <Plus className="w-4 h-4" /> {activeTab === 'teams' ? 'Fonder un Nid' : 'Sceller un Projet'}
        </button>
      </header>

      {/* 🧭 NAVIGATION DES MONDES */}
      <nav className="flex gap-10 mb-12 border-b border-white/5">
        {['teams', 'projects'].map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`pb-4 text-[11px] uppercase font-black tracking-[0.25em] transition-all relative ${
              activeTab === tab ? 'text-[#E5484D]' : 'text-slate-600 hover:text-slate-300'
            }`}
          >
            {tab === 'teams' ? 'Escouades (Nids)' : 'Chantiers (Projets)'}
            {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#E5484D] shadow-[0_0_10px_#E5484D]" />}
          </button>
        ))}
      </nav>

      {/* 🌌 CONTENU DYNAMIQUE */}
      <main className="animate-in fade-in duration-700">
        {activeTab === 'teams' ? (
          <div className="grid grid-cols-1 gap-8">
            {inceptions.map((team) => (
              <section key={team.uid} className="bio-card p-6 border-l-4 border-l-[#E5484D]">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <Network className="w-5 h-5 text-[#E5484D]" />
                    <h2 className="text-xl font-bold uppercase">{team.name}</h2>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setActiveInceptionId(team.uid)}
                      className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-[#E5484D] transition-all"
                    >
                      <UserPlus size={18} />
                    </button>
                    <button className="p-2 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-500">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {team.members?.map((member: any) => (
                    <div key={member.uid} className="bg-white/5 p-3 rounded-lg flex items-center justify-between border border-white/5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">{member.username}</span>
                        <span className="text-[10px] text-[#E5484D] uppercase tracking-widest">{member.role}</span>
                      </div>
                      <ShieldCheck size={14} className="text-slate-600" />
                    </div>
                  ))}
                </div>

                {/* RADAR DE RECRUTEMENT */}
                {activeInceptionId === team.uid && (
                  <div className="mt-6 p-4 border-t border-white/5 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-[10px] uppercase font-mono text-slate-500">Radar à Oiseaux</label>
                      <X size={14} className="cursor-pointer hover:text-[#E5484D]" onClick={() => setActiveInceptionId(null)} />
                    </div>
                    <input 
                      type="text" 
                      placeholder="Chercher un pseudo..."
                      className="w-full bg-black/40 border border-white/10 p-3 rounded-lg text-sm outline-none focus:border-[#E5484D]/50 mb-3"
                      onChange={(e) => handleSearchBirds(e.target.value)}
                    />
                    <div className="space-y-2">
                      {foundBirds.map(bird => (
                        <div key={bird.uid} className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/5 hover:border-[#E5484D]/30 transition-all">
                          <span className="text-xs">{bird.username}</span>
                          <button 
                            onClick={() => inviteBirdToTeam(team.uid, bird.uid)}
                            className="text-[9px] bg-[#E5484D] px-3 py-1 rounded font-black uppercase"
                          >
                            Inviter
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            ))}
          </div>
        ) : (
          <ProjectDashboard 
            projects={projects} 
            onEditProject={(uid) => setActiveInceptionId(uid)} 
          />
        )}
      </main>

      {/* 🏗️ MODALE DE FONDATION UNIFIÉE */}
      {activeInceptionId === 'global' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#05070A]/95 backdrop-blur-xl">
          <div className="w-full max-w-2xl bio-card p-10 border border-white/5">
            <h3 className="text-2xl font-black uppercase mb-8 text-[#E5484D] flex items-center gap-3">
              <Plus className="w-6 h-6" />
              {activeTab === 'teams' ? "Amorcer un Nid" : "Sceller un Chantier"}
            </h3>
            
            {activeTab === 'teams' ? (
              <form onSubmit={createNewTeam} className="space-y-6">
                <input name="name" placeholder="Nom de l'escouade" required className="bio-input" />
                <textarea name="description" placeholder="Mission du nid..." className="bio-input h-32" />
                <div className="pt-4 flex flex-col gap-4">
                  <button type="submit" className="w-full bg-[#E5484D] py-4 rounded-xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] transition-transform shadow-[0_0_20px_rgba(229,72,77,0.2)]">
                    Confirmer la Fondation
                  </button>
                  <button type="button" onClick={() => setActiveInceptionId(null)} className="text-[10px] text-slate-500 uppercase font-mono tracking-widest hover:text-slate-300">
                    Abandonner
                  </button>
                </div>
              </form>
            ) : (
              <ProjectForm 
                ownerUid="user_999" // TODO: Remplacer par l'UID de l'oiseau connecté
                existingProjects={projects}
                onSuccess={handleCreateSuccess}
                onCancel={() => setActiveInceptionId(null)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}