// apps/hub-central/app/[locale]/(inceptions)/dashboard/page.tsx
'use client';

import React, { useState } from 'react';
import { Activity, CloudLightning, Sun, Users, Eye, Database, Share2, Wind } from 'lucide-react';

export default function CanopyDashboard() {
  // États fictifs pour l'animation du dashboard
  const [collectiveMood, setCollectiveMood] = useState<'soleil' | 'orage'>('soleil');
  const [syncStatus, setSyncStatus] = useState(100);

  return (
    <div className="min-h-screen p-6 md:p-10 space-y-8 bg-slate-900 text-slate-200 font-sans">
      
      {/* 👑 En-tête du Nid */}
      <header className="flex justify-between items-end border-b border-red-500/20 pb-6">
        <div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600 tracking-tighter">
            Le Nid de Commandement
          </h1>
          <p className="text-sm font-mono text-slate-400 mt-2 flex items-center gap-2">
            <Wind size={14} className="text-red-400 animate-pulse" />
            Altitudes de la Canopée : Nominal.
          </p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setCollectiveMood(prev => prev === 'soleil' ? 'orage' : 'soleil')}
            className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:border-red-500 transition-colors text-xs font-bold uppercase"
          >
            Simuler Humeur
          </button>
        </div>
      </header>

      {/* 🌿 La Grille Organique */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

        {/* 🌤️ WIDGET 1 : Le Baromètre (Santé Mentale) - Prend 4 colonnes */}
        <div className="md:col-span-4 bio-card bg-slate-800/50 border border-red-500/10 p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-100 transition-opacity">
            <Activity className="text-red-400" size={24} />
          </div>
          <h2 className="text-lg font-bold text-slate-300 mb-4">Baromètre Collectif</h2>
          
          <div className="flex flex-col items-center justify-center py-6">
            {collectiveMood === 'soleil' ? (
              <div className="flex flex-col items-center text-amber-200">
                <Sun size={64} className="animate-[spin_10s_linear_infinite]" />
                <span className="mt-4 font-mono text-sm font-bold">Zénith Atteint : Harmonie</span>
              </div>
            ) : (
              <div className="flex flex-col items-center text-red-400">
                <CloudLightning size={64} className="animate-pulse" />
                <span className="mt-4 font-mono text-sm font-bold">Vents Violents : Surcharge détectée</span>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 text-center">Basé sur l'analyse sémantique des nids et les temps de connexion.</p>
        </div>

        {/* 🦉 WIDGET 2 : L'Œil du Hibou (Modération) - Prend 8 colonnes */}
        <div className="md:col-span-8 bio-card bg-slate-800/50 border border-red-500/10 p-6 rounded-3xl flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-300 flex items-center gap-2">
              <Eye className="text-red-400" size={20} />
              L'Œil du Grand Hibou
            </h2>
            <span className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-[10px] font-black uppercase tracking-widest">
              3 Alertes
            </span>
          </div>
          
          <div className="flex-1 space-y-3 overflow-y-auto pr-2">
            {[
              { id: 1, level: 'critique', msg: 'Plumes ébouriffées dans le Salon E2EE (Conflit sémantique).', time: 'Il y a 2 min' },
              { id: 2, level: 'moyen', msg: 'Échange de troc inhabituel (Marché).', time: 'Il y a 14 min' },
              { id: 3, level: 'bas', msg: 'Nouvel oiseau a rejoint la volée sans nid assigné.', time: 'Il y a 1h' },
            ].map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-700/50 hover:border-red-400/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${alert.level === 'critique' ? 'bg-red-500 animate-ping' : alert.level === 'moyen' ? 'bg-amber-500' : 'bg-slate-500'}`} />
                  <span className="text-sm font-medium text-slate-300">{alert.msg}</span>
                </div>
                <span className="text-xs font-mono text-slate-500">{alert.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 🕸️ WIDGET 3 : Le Mycélium (Neo4j Troupes) - Prend 6 colonnes */}
        <div className="md:col-span-6 bio-card bg-slate-800/50 border border-red-500/10 p-6 rounded-3xl h-64 flex flex-col justify-center items-center relative group">
          <Share2 className="text-slate-700 group-hover:text-red-500/50 transition-colors absolute w-32 h-32 -z-10" />
          <h2 className="text-lg font-bold text-slate-300 absolute top-6 left-6">Le Mycélium (Troupes)</h2>
          <div className="text-center mt-8">
            <p className="text-3xl font-black text-white">1,402</p>
            <p className="text-xs text-slate-400 font-mono mt-1">Nœuds relationnels actifs (Neo4j)</p>
          </div>
          <button className="mt-4 px-4 py-2 bg-red-500/10 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white transition-all">
            Explorer le Graphe
          </button>
        </div>

        {/* ⚙️ WIDGET 4 : Les Cœurs Jumeaux (Moteur de Synchro) - Prend 6 colonnes */}
        <div className="md:col-span-6 bio-card bg-slate-800/50 border border-red-500/10 p-6 rounded-3xl flex items-center justify-around">
          
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-red-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              <Database className="text-red-400" />
            </div>
            <span className="mt-3 text-xs font-bold uppercase text-slate-400">La Silice (Mongo)</span>
            <span className="text-[10px] text-emerald-400 font-mono mt-1">UP & RUNNING</span>
          </div>

          <div className="flex gap-1 items-center">
            <div className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
            <div className="w-2 h-2 rounded-full bg-red-400 animate-ping delay-75" />
            <div className="w-2 h-2 rounded-full bg-red-400 animate-ping delay-150" />
          </div>

          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-red-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              <Share2 className="text-red-400" />
            </div>
            <span className="mt-3 text-xs font-bold uppercase text-slate-400">Le Graphe (Neo4j)</span>
            <span className="text-[10px] text-emerald-400 font-mono mt-1">UP & RUNNING</span>
          </div>

        </div>

      </div>
    </div>
  );
}