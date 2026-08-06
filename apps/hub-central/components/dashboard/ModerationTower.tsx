// apps/hub-central/components/dashboard/ModerationTower.tsx
'use client';

import React, { useState } from 'react';
import { ShieldAlert, Power, Activity, Database, EyeOff, AlertOctagon, Share2, Search } from 'lucide-react';

export const ModerationTower = () => {
    const [isLockdown, setIsLockdown] = useState(false);

    return (
        <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-8 bg-slate-950 text-slate-200 font-sans min-h-full">
            
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 border-b border-red-900/30 pb-6">
                <div>
                    <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-700 tracking-tighter flex items-center gap-3">
                        <ShieldAlert className="text-red-500" size={28} />
                        Tour de Modération
                    </h1>
                    <p className="text-sm text-slate-400 mt-2">
                        Surveillance des flux, intégrité du Graphe et protection de la volière.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-full px-4 py-2 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-mono font-bold text-slate-300">NIVEAU DE MENACE : FAIBLE</span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* 🔴 WIDGET 1 : Le Protocole d'Urgence (Kill Switch) - 4 colonnes */}
                <div className={`lg:col-span-4 p-8 rounded-3xl border transition-all duration-700 flex flex-col items-center justify-center text-center ${isLockdown ? 'bg-red-950/40 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.2)]' : 'bg-slate-900/50 border-slate-800'}`}>
                    <AlertOctagon size={48} className={`mb-6 ${isLockdown ? 'text-red-500 animate-pulse' : 'text-slate-600'}`} />
                    <h2 className="text-xl font-black text-slate-200 mb-2">Protocole Lockdown</h2>
                    <p className="text-xs text-slate-400 mb-8 px-4">
                        Verrouille instantanément les salons publics, fige la marketplace et place l'Îlot en lecture seule.
                    </p>
                    
                    <button 
                        onClick={() => setIsLockdown(!isLockdown)}
                        className={`group relative overflow-hidden rounded-2xl p-1 transition-all duration-300 ${isLockdown ? 'bg-slate-800' : 'bg-gradient-to-b from-red-500 to-red-800 shadow-lg shadow-red-900/50'}`}
                    >
                        <div className={`flex items-center gap-3 px-8 py-4 rounded-xl font-black uppercase tracking-widest transition-colors ${isLockdown ? 'bg-slate-900 text-slate-400' : 'bg-black/20 text-white'}`}>
                            <Power size={18} className={isLockdown ? 'text-slate-500' : 'text-white'} />
                            {isLockdown ? 'Désactiver le Bouclier' : 'Initier le Lockdown'}
                        </div>
                    </button>
                </div>

                {/* 📡 WIDGET 2 : Le Radar des Anomalies - 8 colonnes */}
                <div className="lg:col-span-8 p-8 rounded-3xl bg-slate-900/50 border border-slate-800 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-slate-300 flex items-center gap-2">
                            <Activity className="text-rose-500" size={20} />
                            Flux des Anomalies
                        </h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                            <input 
                                type="text" 
                                placeholder="Filtrer les signalements..." 
                                className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-red-500/50 w-64"
                            />
                        </div>
                    </div>

                    <div className="flex-1 space-y-3 overflow-y-auto pr-2 max-h-[300px]">
                        {/* Fausse donnée 1 */}
                        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-4 hover:border-red-500/30 transition-colors group">
                            <div className="p-2 bg-red-950/50 rounded-lg text-red-500">
                                <EyeOff size={18} />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between">
                                    <h3 className="text-sm font-bold text-slate-200">Conflit Sémantique Détecté</h3>
                                    <span className="text-[10px] font-mono text-slate-500">12:42</span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">Surcharge émotionnelle repérée dans le salon public "L'Agora".</p>
                            </div>
                            <button className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded-lg transition-colors">
                                Isoler
                            </button>
                        </div>
                        
                        {/* Fausse donnée 2 */}
                        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-4 hover:border-rose-500/30 transition-colors group">
                            <div className="p-2 bg-amber-950/50 rounded-lg text-amber-500">
                                <ShieldAlert size={18} />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between">
                                    <h3 className="text-sm font-bold text-slate-200">Tentative de Spam (Marketplace)</h3>
                                    <span className="text-[10px] font-mono text-slate-500">11:15</span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">L'oiseau "ShadowBeak" a posté 15 requêtes de troc en 2 minutes.</p>
                            </div>
                            <button className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded-lg transition-colors">
                                Examiner
                            </button>
                        </div>
                    </div>
                </div>

                {/* ⚙️ WIDGET 3 : Surveillance de l'Intégrité (Synchro Mongo/Neo4j) - 12 colonnes */}
                <div className="lg:col-span-12 p-6 rounded-3xl bg-slate-900/30 border border-slate-800/50 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-950 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                            <Database size={20} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider">La Silice (MongoDB)</h4>
                            <p className="text-xs font-mono text-emerald-400 mt-1 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                STATUS: UP & RUNNING
                            </p>
                        </div>
                    </div>

                    <div className="flex-1 h-px bg-gradient-to-r from-emerald-500/20 via-slate-700 to-emerald-500/20 hidden md:block" />

                    <div className="flex items-center gap-4 text-right flex-row-reverse">
                        <div className="w-12 h-12 rounded-xl bg-slate-950 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                            <Share2 size={20} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Le Graphe (Neo4j)</h4>
                            <p className="text-xs font-mono text-emerald-400 mt-1 flex items-center justify-end gap-2">
                                STATUS: UP & RUNNING
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};