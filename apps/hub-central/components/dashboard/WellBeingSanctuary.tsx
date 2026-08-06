// apps/hub-central/components/dashboard/WellbeingSanctuary.tsx
'use client';

import React, { useState } from 'react';
import { Feather, Moon, Wind, Shield, Lock, CloudRain, Sun, Heart } from 'lucide-react';
import { Link } from '../../navigation';

export const WellbeingSanctuary = () => {
    const [energyLevel, setEnergyLevel] = useState<number>(3); // 1 à 5 plumes
    const [isExiled, setIsExiled] = useState<boolean>(false);

    return (
        <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-8 bg-slate-900 text-slate-200 font-sans min-h-full">
            
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 border-b border-rose-900/30 pb-6">
                <div>
                    <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-red-500 tracking-tighter flex items-center gap-3">
                        <Heart className="text-rose-400" size={28} />
                        Le Sanctuaire du Bien-être
                    </h1>
                    <p className="text-sm text-slate-400 mt-2">
                        Un cocon de déconnexion. Aucune attente, aucune pression. Juste l'Oiseau et son souffle.
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                {/* 🛡️ WIDGET 1 : Mode Nid Douillet (Exil Volontaire) - 7 colonnes */}
                <div className={`md:col-span-7 p-8 rounded-3xl border transition-all duration-700 relative overflow-hidden ${isExiled ? 'bg-rose-950/20 border-rose-500/30 shadow-[0_0_40px_rgba(244,63,94,0.1)]' : 'bg-slate-800/40 border-slate-700/50'}`}>
                    <div className="flex items-start justify-between relative z-10">
                        <div className="max-w-md">
                            <h2 className={`text-xl font-bold flex items-center gap-2 ${isExiled ? 'text-rose-300' : 'text-slate-300'}`}>
                                <Shield size={20} /> Mode Nid Douillet (Exil)
                            </h2>
                            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                                {isExiled 
                                    ? "Vous êtes actuellement protégé. Les notifications sont coupées, votre statut indique que vous vous reposez. La Canopée veille sur votre nid."
                                    : "Coupez les ponts temporairement. Désactivez les alertes et indiquez aux autres oiseaux que vous avez besoin de silence."}
                            </p>
                        </div>
                        
                        {/* Toggle Button Organique */}
                        <button 
                            onClick={() => setIsExiled(!isExiled)}
                            className={`w-16 h-8 rounded-full p-1 transition-colors duration-500 ease-in-out focus:outline-none ${isExiled ? 'bg-rose-500' : 'bg-slate-700'}`}
                        >
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-500 ease-in-out ${isExiled ? 'transform translate-x-8 bg-white' : 'bg-slate-400'}`}>
                                {isExiled ? <Moon size={14} className="text-rose-500" /> : <Sun size={14} className="text-slate-800" />}
                            </div>
                        </button>
                    </div>
                    {/* Background décoratif */}
                    {isExiled && (
                        <Moon className="absolute -bottom-10 -right-10 w-48 h-48 text-rose-500/5 rotate-12 pointer-events-none" />
                    )}
                </div>

                {/* 🪶 WIDGET 2 : Réserve de Plumes (Théorie des Cuillères) - 5 colonnes */}
                <div className="md:col-span-5 p-8 rounded-3xl bg-slate-800/40 border border-slate-700/50 flex flex-col justify-center">
                    <h2 className="text-lg font-bold text-slate-300 flex items-center gap-2 mb-2">
                        Réserve d'Énergie
                    </h2>
                    <p className="text-xs text-slate-400 mb-6">Ajustez votre disponibilité mentale pour la journée.</p>
                    
                    <div className="flex gap-2 justify-between items-center bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50">
                        {[1, 2, 3, 4, 5].map((level) => (
                            <button
                                key={level}
                                onClick={() => setEnergyLevel(level)}
                                className="focus:outline-none group relative"
                            >
                                <Feather 
                                    size={32} 
                                    strokeWidth={1.5}
                                    className={`transition-all duration-300 ${level <= energyLevel ? 'text-amber-400 fill-amber-400/20 scale-110 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'text-slate-600 hover:text-slate-500'}`} 
                                />
                            </button>
                        ))}
                    </div>
                    
                    <div className="mt-4 p-3 rounded-xl bg-amber-900/10 border border-amber-500/20 text-amber-200/80 text-xs text-center font-medium">
                        {energyLevel <= 2 
                            ? "Votre réserve est basse. L'Îlot masquera les tâches complexes aujourd'hui." 
                            : energyLevel === 3 
                            ? "Une journée équilibrée. Prenez les choses à votre rythme." 
                            : "Vous êtes en pleine forme, l'horizon est dégagé !"}
                    </div>
                </div>

                {/* 🌬️ WIDGET 3 : Le Souffle de la Silice - 6 colonnes */}
                <div className="md:col-span-6 p-8 rounded-3xl bg-slate-800/40 border border-slate-700/50 flex flex-col items-center justify-center relative overflow-hidden min-h-[300px]">
                    <div className="absolute top-6 left-6">
                        <h2 className="text-lg font-bold text-slate-300 flex items-center gap-2">
                            <Wind size={20} className="text-cyan-400" />
                            Le Souffle de la Silice
                        </h2>
                    </div>
                    
                    {/* Animation de Cohérence Cardiaque CSS */}
                    <div className="relative flex items-center justify-center mt-8">
                        <div className="absolute w-32 h-32 bg-cyan-500/20 rounded-full animate-[ping_10s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
                        <div className="absolute w-24 h-24 bg-cyan-400/30 rounded-full animate-[pulse_10s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
                        <div className="w-16 h-16 bg-slate-900 border border-cyan-400/50 rounded-full z-10 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.4)]">
                            <Wind size={24} className="text-cyan-300" />
                        </div>
                    </div>
                    <p className="mt-12 text-xs text-slate-400 font-mono uppercase tracking-widest">
                        Inspirez... Expirez...
                    </p>
                </div>

                {/* 📓 WIDGET 4 & 5 : Météo Collective et Journal - 6 colonnes */}
                <div className="md:col-span-6 flex flex-col gap-6">
                    
                    {/* Météo Collective */}
                    <div className="flex-1 p-6 rounded-3xl bg-slate-800/40 border border-slate-700/50 flex items-start gap-4">
                        <div className="p-3 bg-rose-900/30 rounded-2xl text-rose-400">
                            <CloudRain size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-300">Météo Collective de l'Îlot</h3>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                La Canopée semble <span className="text-rose-400 font-semibold">fatiguée</span> aujourd'hui. De nombreux oiseaux sont en repos. Soyons indulgents les uns envers les autres.
                            </p>
                        </div>
                    </div>

                    {/* Journal des Murmures (Lien Salon E2EE) */}
                    <Link href="/salon" className="flex-1 p-6 rounded-3xl bg-gradient-to-br from-slate-800/80 to-slate-900 border border-emerald-900/50 hover:border-emerald-500/50 transition-colors group relative overflow-hidden">
                        <Lock className="absolute -right-4 -bottom-4 w-24 h-24 text-emerald-500/5 group-hover:text-emerald-500/10 transition-colors pointer-events-none rotate-12" />
                        <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                            <Feather size={16} className="text-emerald-400" /> Journal des Murmures
                        </h3>
                        <p className="text-xs text-slate-400 mt-2 mb-4 leading-relaxed max-w-[80%]">
                            Déposez vos pensées lourdes dans le Salon Privé. Un espace chiffré de bout en bout où personne d'autre ne peut lire vos résonances.
                        </p>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 group-hover:text-emerald-300">
                            Rejoindre le sanctuaire E2EE &rarr;
                        </span>
                    </Link>

                </div>
            </div>
        </div>
    );
};