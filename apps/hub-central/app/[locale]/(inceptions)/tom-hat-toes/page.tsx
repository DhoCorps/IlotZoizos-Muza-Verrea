'use client';

import { useState, useEffect } from 'react';
import { Loader2, Plus, Network, UserPlus, ShieldCheck, Trash2, X } from 'lucide-react';

export default function TomHatToesHub() {
  const [inceptions, setInceptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeInceptionId, setActiveInceptionId] = useState<string | null>(null);
  
  // États pour le recrutement
  const [searchBird, setSearchBird] = useState("");
  const [foundBirds, setFoundBirds] = useState<any[]>([]);
  const [isRecruiting, setIsRecruiting] = useState(false);

  const refreshData = async () => {
    setLoading(true);
    try {
      // Suture avec ton API Teams
      const response = await fetch('/api/teams').then(res => res.json());
      setInceptions(Array.isArray(response) ? response : []);
    } catch (err) {
      console.error("🚨 Erreur Hub:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refreshData(); }, []);

  // --- 🛰️ LOGIQUE DE RECRUTEMENT (RADAR) ---
  const handleSearchBirds = async (val: string) => {
    setSearchBird(val);
    if (val.length < 2) return setFoundBirds([]);
    
    try {
      // Appel à ta nouvelle route radar
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

  // --- 🏗️ FONDATION DE NID ---
  const createNewTeam = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      category: 'SOCIAL',
      isPrivate: true
    };

    try {
      await fetch('/api/teams', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      refreshData();
      setActiveInceptionId(null);
    } catch (err) { console.error("Erreur création nid", err); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#05070A]">
      <Loader2 className="w-10 h-10 animate-spin text-[#E5484D]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#05070A] text-slate-100 p-6 md:p-12">
      
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-[#E5484D]">
            Tom-Hat-Toes <span className="text-slate-800">/</span> Hub
          </h1>
          <p className="text-slate-500 font-mono text-xs uppercase tracking-[0.3em] mt-2">
            Architecture des Escouades & Volées
          </p>
        </div>
        
        <button 
          onClick={() => setActiveInceptionId('global')}
          className="px-6 py-3 bg-[#E5484D]/10 border border-[#E5484D]/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#E5484D]/20 transition-all flex items-center gap-2 group text-[#E5484D]"
        >
          <Plus className="w-4 h-4" /> Fonder un Nid
        </button>
      </header>

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
                  title="Recruter un oiseau"
                >
                  <UserPlus size={18} />
                </button>
                <button className="p-2 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-500">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            {/* LISTE DES MEMBRES ACTUELS */}
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

            {/* MODULE DE RECRUTEMENT DYNAMIQUE */}
            {activeInceptionId === team.uid && (
              <div className="mt-6 p-4 border-t border-white/5 animate-in fade-in duration-500">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-[10px] uppercase font-mono text-slate-500">Radar à Oiseaux (Select Dynamique)</label>
                  <X size={14} className="cursor-pointer" onClick={() => setActiveInceptionId(null)} />
                </div>
                <input 
                  type="text" 
                  placeholder="Chercher un pseudo..."
                  className="w-full bg-black/40 border border-white/10 p-3 rounded-lg text-sm outline-none focus:border-[#E5484D]/50"
                  onChange={(e) => handleSearchBirds(e.target.value)}
                />
                <div className="mt-2 space-y-2">
                  {foundBirds.map(bird => (
                    <div key={bird.uid} className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/5 hover:border-[#E5484D]/30 transition-all">
                      <span className="text-xs">{bird.username}</span>
                      <button 
                        onClick={() => inviteBirdToTeam(team.uid, bird.uid)}
                        className="text-[9px] bg-[#E5484D] px-2 py-1 rounded font-bold uppercase"
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

      {/* MODALE DE FONDATION (GLOBAL) */}
      {activeInceptionId === 'global' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#05070A]/90 backdrop-blur-md">
          <form onSubmit={createNewTeam} className="w-full max-w-md bio-card p-8">
            <h3 className="text-xl font-black uppercase mb-6 text-[#E5484D]">Fondation d'un nouveau Nid</h3>
            <div className="space-y-4">
              <input name="name" placeholder="Nom de l'escouade" required className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none focus:border-[#E5484D]" />
              <textarea name="description" placeholder="Mission du nid..." className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none focus:border-[#E5484D] h-32" />
              <button type="submit" className="w-full bg-[#E5484D] py-4 rounded-xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] transition-transform">
                Amorcer l'Escouade
              </button>
              <button type="button" onClick={() => setActiveInceptionId(null)} className="w-full text-center text-[10px] text-slate-500 uppercase font-mono mt-4">
                Abandonner
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}