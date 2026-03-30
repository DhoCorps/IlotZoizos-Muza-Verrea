'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link'; // 🟢 Ajout de l'import pour la navigation Next.js
import LoadingZoizos from '../../components/ui/LoadingZoizos';

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    avatarUrl: ''
  });

  useEffect(() => {
    if (session?.user) {
      setFormData({
        username: session.user.name || '',
        avatarUrl: (session.user as any).avatarUrl || ''
      });
    }
  }, [session]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/user/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        // Met à jour la session locale pour que le header change instantanément
        await update({ name: formData.username });
        alert("Profil synchronisé dans le Nexus ! <(:<");
      }
    } catch (err) {
      console.error("Erreur de synchro:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <LoadingZoizos message="Mise à jour des bases Mongo & Neo4j..." />;

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold text-white mb-8">Paramètres de l'Oiseau</h1>
      
      {/* --- FORMULAIRE DU PROFIL --- */}
      <form onSubmit={handleUpdate} className="space-y-6 bg-slate-900/50 p-8 rounded-2xl border border-slate-800 backdrop-blur-xl mb-8">
        <div className="flex items-center gap-6 mb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-3xl shadow-lg border-2 border-slate-700">
            {formData.avatarUrl ? <img src={formData.avatarUrl} alt="Avatar" className="rounded-full" /> : "Zo"}
          </div>
          <div>
            <p className="text-white font-medium">Avatar de l'Îlot</p>
            <p className="text-slate-400 text-sm">Identité visuelle dans le graphe.</p>
          </div>
        </div>

        <div>
          <label className="block text-slate-300 mb-2">Nom d'affichage</label>
          <input 
            type="text" 
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500"
            value={formData.username}
            onChange={(e) => setFormData({...formData, username: e.target.value})}
          />
        </div>

        <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-emerald-900/20">
          Sauvegarder les modifications
        </button>
      </form>

      {/* --- 🟢 NOUVELLE SECTION : ADMINISTRATION DES RÔLES --- */}
      <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-800 backdrop-blur-xl hover:border-indigo-500/50 transition-colors">
        <div className="flex items-center space-x-4 mb-6">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
            <span className="text-2xl">🔨</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Atelier des Rôles</h3>
            <p className="text-sm text-slate-400">Gérez la hiérarchie de l'Îlot et les accès par défaut.</p>
          </div>
        </div>
        
        <Link 
          href="/setting/roles" 
          className="inline-flex items-center justify-center w-full bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300 font-medium py-3 px-4 rounded-lg border border-indigo-500/30 transition-all"
        >
          Accéder à la Forge →
        </Link>
      </div>

    </div>
  );
}