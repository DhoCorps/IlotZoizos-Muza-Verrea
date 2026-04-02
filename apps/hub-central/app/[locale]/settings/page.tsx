'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { User, Users, Shield, Key, Network, Plus, Check } from 'lucide-react';
import LoadingZoizos from '../../../components/ui/LoadingZoizos';

type Tab = 'profile' | 'users' | 'teams' | 'roles' | 'permissions';

export default function NexusSettingsPage() {
  const { data: session, update } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [isLoading, setIsLoading] = useState(false);

  // 1. État initial corrigé
  const [formData, setFormData] = useState({
    username: '',
    avatarUrl: '',
    isAvailableForTeamRequest: true 
  });

  // 2. Synchronisation de la session (Suture de sécurité)
  useEffect(() => {
    if (session?.user) {
      setFormData({
        username: session.user.name || '',
        avatarUrl: (session.user as any).avatarUrl || '',
        // On vérifie si la donnée existe dans la session, sinon true par défaut
        isAvailableForTeamRequest: (session.user as any).isAvailableForTeamRequest !== false 
      });
    }
  }, [session]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/user/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        // On met à jour la session locale
        await update({ 
          name: formData.username,
          isAvailableForTeamRequest: formData.isAvailableForTeamRequest 
        });
        alert("Profil synchronisé dans le Nexus ! <(:<");
      }
    } catch (err) {
      console.error("Erreur de synchro:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <LoadingZoizos message="Mise à jour des matrices Mongo & Neo4j..." />;

  return (
    <div className="min-h-screen bg-[#05070A] text-slate-100 p-6 md:p-12">
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-[#E5484D]">
            Nexus <span className="text-slate-800">/</span> Paramètres
          </h1>
          <p className="text-slate-500 font-mono text-xs uppercase tracking-[0.3em] mt-2">
            Gestion de l'Oiseau et contrôle de la Matrice
          </p>
        </div>
      </header>

      {/* NAVIGATION */}
      <div className="flex space-x-2 mb-8 border-b border-white/5 pb-px overflow-x-auto">
        <TabButton id="profile" current={activeTab} onClick={setActiveTab} icon={<User size={16} />} label="Mon Nid (Profil)" />
        <div className="w-px h-6 bg-white/10 self-center mx-2" />
        <TabButton id="users" current={activeTab} onClick={setActiveTab} icon={<Users size={16} />} label="Oiseaux" />
        <TabButton id="teams" current={activeTab} onClick={setActiveTab} icon={<Network size={16} />} label="Nids (Teams)" />
        <TabButton id="roles" current={activeTab} onClick={setActiveTab} icon={<Shield size={16} />} label="Atelier des Rôles" />
        <TabButton id="permissions" current={activeTab} onClick={setActiveTab} icon={<Key size={16} />} label="Permissions" />
      </div>

      <div className="bio-card p-6 md:p-8 min-h-[50vh]">
        {activeTab === 'profile' && (
          <div className="animate-in fade-in duration-300 max-w-2xl">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
              <User className="text-[#E5484D]" /> Identité dans l'Îlot
            </h2>
            
            <form onSubmit={handleProfileUpdate} className="space-y-6">
              {/* AVATAR SECTION */}
              <div className="flex items-center gap-6 mb-8 p-6 bg-white/5 border border-white/5 rounded-2xl">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-slate-800 to-slate-900 flex items-center justify-center text-3xl shadow-lg border-2 border-[#E5484D]/30 text-[#E5484D]">
                  {formData.avatarUrl ? <img src={formData.avatarUrl} alt="Avatar" className="rounded-full w-full h-full object-cover" /> : "Zo"}
                </div>
                <div>
                  <p className="text-white font-medium">Avatar de l'Îlot</p>
                  <p className="text-slate-400 text-sm">Ton incarnation visuelle dans le graphe Neo4j.</p>
                </div>
              </div>

              {/* USERNAME */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 font-mono uppercase tracking-widest text-xs">Nom d'oiseau (Affichage)</label>
                <input 
                  type="text" 
                  className="w-full rounded-xl border border-white/5 bg-white/5 p-3 text-white outline-none focus:border-[#E5484D]/50 transition-all font-mono"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                />
              </div>

              {/* 🛡️ LA GREFFE : LE COMMUTATEUR DE DISPONIBILITÉ */}
              <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl hover:border-[#E5484D]/20 transition-all cursor-pointer" 
                   onClick={() => setFormData({...formData, isAvailableForTeamRequest: !formData.isAvailableForTeamRequest})}>
                <div>
                  <p className="text-sm font-bold text-white uppercase tracking-wider">Statut de Recrutement</p>
                  <p className="text-xs text-slate-400 font-mono">Permettre aux autres nids de t'envoyer des invitations.</p>
                </div>
                <div className={`w-12 h-6 rounded-full transition-all flex items-center p-1 ${formData.isAvailableForTeamRequest ? 'bg-[#E5484D]' : 'bg-slate-700'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-all shadow-md ${formData.isAvailableForTeamRequest ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full py-4 px-4 mt-4 rounded-xl text-white font-black uppercase tracking-widest transition-all shadow-lg bg-[#E5484D] hover:bg-[#E5484D]/80 shadow-[#E5484D]/20 active:scale-[0.98]"
              >
                Mettre à jour l'empreinte
              </button>
            </form>
          </div>
        )}

        {/* ... AUTRES ONGLETS ... */}
        {activeTab === 'users' && <Placeholder tab="Oiseaux" />}
        {activeTab === 'teams' && <Placeholder tab="Nids (Teams)" />}
        {activeTab === 'roles' && <Placeholder tab="Rôles" />}
        {activeTab === 'permissions' && <Placeholder tab="Permissions" />}

      </div>
    </div>
  );
}

// --- SOUS-COMPOSANTS ---

function Placeholder({ tab }: { tab: string }) {
  return (
    <div className="animate-in fade-in duration-300">
      <h2 className="text-xl font-bold text-white mb-4">Gestion des {tab}</h2>
      <p className="text-sm text-slate-400 font-mono">Module en cours de déploiement dans le Nexus...</p>
    </div>
  );
}

function TabButton({ id, current, onClick, icon, label }: { id: Tab, current: Tab, onClick: (id: Tab) => void, icon: React.ReactNode, label: string }) {
  const isActive = current === id;
  return (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] transition-all border-b-2 whitespace-nowrap ${
        isActive 
          ? 'border-[#E5484D] text-[#E5484D] bg-[#E5484D]/5' 
          : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}