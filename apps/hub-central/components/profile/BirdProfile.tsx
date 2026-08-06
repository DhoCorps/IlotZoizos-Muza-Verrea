// apps/hub-central/components/profile/BirdProfile.tsx
'use client';

import React, { useState } from 'react';
import { User, Eye, EyeOff, Globe, Lock, ShieldCheck, Palette, Heart, Package, Feather } from 'lucide-react';

type PrivacyMode = 'public' | 'private' | 'granular';

export const BirdProfile = ({ birdName = "Oiseau Anonyme" }) => {
    // Mode global de confidentialité
    const [privacyMode, setPrivacyMode] = useState<PrivacyMode>('granular');

    // Paramètres granulaires (actifs uniquement si mode = 'granular')
    const [permissions, setPermissions] = useState({
        showIdentity: true,
        showCreations: false,
        showWellbeing: false,
        showInventory: true,
    });

    const handleToggle = (key: keyof typeof permissions) => {
        if (privacyMode !== 'granular') return; // Bloqué si on n'est pas en mode granulaire
        setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Helper pour savoir si un bloc est visible au final
    const isVisible = (key: keyof typeof permissions) => {
        if (privacyMode === 'public') return true;
        if (privacyMode === 'private') return false;
        return permissions[key];
    };

    return (
        <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-8 bg-slate-900 text-slate-200 font-sans min-h-full">
            
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 border-b border-cyan-900/30 pb-6">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-cyan-900/30 border-2 border-cyan-500/50 flex items-center justify-center text-cyan-400">
                        <User size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tighter">
                            {birdName}
                        </h1>
                        <p className="text-sm text-slate-400 mt-1 flex items-center gap-2">
                            <ShieldCheck size={16} className="text-emerald-400" />
                            Contrôle de votre empreinte sur l'Îlot
                        </p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* 🎛️ COLONNE GAUCHE : Sélecteur de Rayonnement (Master Control) - 5 colonnes */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="p-6 rounded-3xl bg-slate-800/40 border border-slate-700/50">
                        <h2 className="text-lg font-bold text-slate-200 mb-4">Rayonnement Global</h2>
                        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                            Définissez comment la volière vous perçoit. Vous pouvez vous exposer, vous cacher, ou choisir avec précision.
                        </p>

                        <div className="space-y-3">
                            {/* Option Public */}
                            <button 
                                onClick={() => setPrivacyMode('public')}
                                className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${privacyMode === 'public' ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300' : 'bg-slate-900/50 border-slate-700 hover:border-slate-500 text-slate-400'}`}
                            >
                                <Globe size={20} className={privacyMode === 'public' ? 'text-cyan-400' : ''} />
                                <div className="text-left">
                                    <h3 className="text-sm font-bold">Totalement Public</h3>
                                    <span className="text-[10px] uppercase tracking-wider opacity-70">Livre ouvert</span>
                                </div>
                            </button>

                            {/* Option Privé */}
                            <button 
                                onClick={() => setPrivacyMode('private')}
                                className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${privacyMode === 'private' ? 'bg-rose-950/40 border-rose-500/50 text-rose-300' : 'bg-slate-900/50 border-slate-700 hover:border-slate-500 text-slate-400'}`}
                            >
                                <Lock size={20} className={privacyMode === 'private' ? 'text-rose-400' : ''} />
                                <div className="text-left">
                                    <h3 className="text-sm font-bold">Totalement Privé</h3>
                                    <span className="text-[10px] uppercase tracking-wider opacity-70">Nid verrouillé</span>
                                </div>
                            </button>

                            {/* Option Granulaire */}
                            <button 
                                onClick={() => setPrivacyMode('granular')}
                                className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${privacyMode === 'granular' ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300' : 'bg-slate-900/50 border-slate-700 hover:border-slate-500 text-slate-400'}`}
                            >
                                <ShieldCheck size={20} className={privacyMode === 'granular' ? 'text-emerald-400' : ''} />
                                <div className="text-left">
                                    <h3 className="text-sm font-bold">Sur-Mesure (Granulaire)</h3>
                                    <span className="text-[10px] uppercase tracking-wider opacity-70">Plume par plume</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* 🧩 COLONNE DROITE : Détails Granulaires - 7 colonnes */}
                <div className="lg:col-span-7 space-y-4">
                    <h2 className="text-lg font-bold text-slate-200 mb-2 px-2">Paramètres de Visibilité</h2>
                    
                    <div className={`transition-opacity duration-500 ${privacyMode !== 'granular' ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
                        
                        {/* Bloc : Identité & Aura */}
                        <div className="p-4 mb-3 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-slate-900 rounded-xl text-indigo-400 border border-indigo-500/20">
                                    <Feather size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-200">Identité & Aura</h3>
                                    <p className="text-[10px] text-slate-400 mt-1">Bio, tags, fréquence vibratoire de base.</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleToggle('showIdentity')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${isVisible('showIdentity') ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-900 text-slate-500 border border-slate-700'}`}
                            >
                                {isVisible('showIdentity') ? <><Eye size={14} /> Visible</> : <><EyeOff size={14} /> Caché</>}
                            </button>
                        </div>

                        {/* Bloc : Créations (Letr'In / Partita) */}
                        <div className="p-4 mb-3 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-slate-900 rounded-xl text-amber-400 border border-amber-500/20">
                                    <Palette size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-200">Créations & Art</h3>
                                    <p className="text-[10px] text-slate-400 mt-1">Polices Letr'In, Partitions, Galeries Soon'Art.</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleToggle('showCreations')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${isVisible('showCreations') ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-900 text-slate-500 border border-slate-700'}`}
                            >
                                {isVisible('showCreations') ? <><Eye size={14} /> Visible</> : <><EyeOff size={14} /> Caché</>}
                            </button>
                        </div>

                        {/* Bloc : Santé & Bien-être */}
                        <div className="p-4 mb-3 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-slate-900 rounded-xl text-rose-400 border border-rose-500/20">
                                    <Heart size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-200">État de Bien-être</h3>
                                    <p className="text-[10px] text-slate-400 mt-1">Niveau d'énergie (cuillères), mode exil, stase.</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleToggle('showWellbeing')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${isVisible('showWellbeing') ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-900 text-slate-500 border border-slate-700'}`}
                            >
                                {isVisible('showWellbeing') ? <><Eye size={14} /> Visible</> : <><EyeOff size={14} /> Caché</>}
                            </button>
                        </div>

                        {/* Bloc : Inventaire & Troc */}
                        <div className="p-4 mb-3 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-slate-900 rounded-xl text-cyan-400 border border-cyan-500/20">
                                    <Package size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-200">Inventaire & Troc</h3>
                                    <p className="text-[10px] text-slate-400 mt-1">Objets possédés, historique de la marketplace.</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleToggle('showInventory')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${isVisible('showInventory') ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-900 text-slate-500 border border-slate-700'}`}
                            >
                                {isVisible('showInventory') ? <><Eye size={14} /> Visible</> : <><EyeOff size={14} /> Caché</>}
                            </button>
                        </div>
                        
                    </div>
                    
                    {/* Message d'information dynamique */}
                    {privacyMode !== 'granular' && (
                        <div className="p-4 rounded-xl border border-slate-700/50 bg-slate-800/20 text-xs text-slate-400 flex items-center gap-3">
                            <Lock size={14} className="text-slate-500" />
                            Les options granulaires sont désactivées car vous avez forcé le mode {privacyMode === 'public' ? 'Public' : 'Privé'} global.
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};