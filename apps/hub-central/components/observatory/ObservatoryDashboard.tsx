// apps/hub-central/components/observatory/ObservatoryDashboard.tsx
'use client';

import React from 'react';
import { VibratoryReport } from '@ilot/shared-core';
import { Activity, Waves, Battery, AlertTriangle } from 'lucide-react';

interface ObservatoryDashboardProps {
    report: VibratoryReport;
    birdName: string;
}

export const ObservatoryDashboard: React.FC<ObservatoryDashboardProps> = ({ report, birdName }) => {
    // Thème dynamique basé sur la santé de la volière
    const isHealthy = report.isVolièreHealthy;
    const containerBg = isHealthy ? 'bg-slate-900' : 'bg-rose-950/20';
    const borderColor = isHealthy ? 'border-cyan-500/30' : 'border-rose-500/50';
    const frequencyColor = report.frequencyHz > 600 ? 'text-cyan-400' : 'text-rose-400';
    const glowEffect = isHealthy ? 'shadow-[0_0_30px_rgba(6,182,212,0.15)]' : 'shadow-[0_0_30px_rgba(244,63,94,0.15)]';

    const handleStaseActivation = () => {
        console.log("Le flux de l'Oiseau est mis en stase alchimique.");
    };

    return (
        <div className={`p-8 rounded-3xl border ${borderColor} ${containerBg} ${glowEffect} text-slate-200 transition-all duration-700 relative overflow-hidden`}>
            
            {/* Effet radar en arrière-plan */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 border-[1px] border-cyan-500/10 rounded-full animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] pointer-events-none" />
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-44 h-44 border-[1px] border-cyan-500/20 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] pointer-events-none" />

            <div className="flex justify-between items-start mb-8 relative z-10">
                <div>
                    <h2 className="text-2xl font-black tracking-tighter flex items-center gap-3">
                        <Activity className={frequencyColor} size={28} />
                        Observatoire des Fréquences
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                        Analyse vibratoire de l'Oiseau : <span className="text-white font-bold tracking-wide">{birdName}</span>
                    </p>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border ${isHealthy ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                    {report.aura}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 relative z-10">
                {/* Module Fréquence */}
                <div className="bg-black/40 backdrop-blur-md p-6 rounded-2xl border border-white/5 flex flex-col items-center justify-center group hover:border-cyan-500/30 transition-colors">
                    <Waves className={`${frequencyColor} mb-3 opacity-50 group-hover:opacity-100 transition-opacity`} size={24} />
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Fréquence Vibratoire</span>
                    <div className="flex items-baseline gap-1">
                        <span className={`text-4xl font-black font-mono tracking-tighter ${frequencyColor}`}>
                            {report.frequencyHz}
                        </span>
                        <span className="text-slate-500 font-mono">Hz</span>
                    </div>
                </div>

                {/* Module Balance Vitale */}
                <div className="bg-black/40 backdrop-blur-md p-6 rounded-2xl border border-white/5 flex flex-col items-center justify-center group hover:border-emerald-500/30 transition-colors">
                    <Battery className={`${report.vitalBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'} mb-3 opacity-50 group-hover:opacity-100 transition-opacity`} size={24} />
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Balance Vitale ($\Lambda$)</span>
                    <span className={`text-4xl font-black font-mono tracking-tighter ${report.vitalBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {report.vitalBalance > 0 ? `+${report.vitalBalance}` : report.vitalBalance}
                    </span>
                </div>

                {/* Module Flux de Sève */}
                <div className="bg-black/40 backdrop-blur-md p-6 rounded-2xl border border-white/5 flex flex-col items-center justify-center group hover:border-indigo-500/30 transition-colors">
                    <div className={`w-6 h-6 rounded-full border-2 mb-3 ${report.irrigationStatus === 1 ? 'border-indigo-500 border-t-transparent animate-spin' : 'border-rose-500'} opacity-50 group-hover:opacity-100 transition-opacity`} />
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Flux de Sève (It)</span>
                    <span className={`text-3xl font-black tracking-widest ${report.irrigationStatus === 1 ? 'text-indigo-400' : 'text-rose-600 animate-pulse'}`}>
                        {report.irrigationStatus === 1 ? 'ACTIF' : 'ROMPU'}
                    </span>
                </div>
            </div>

            {/* Alerte de Stase (Ne s'affiche que si nécessaire) */}
            {report.staseTimeMinutes > 15 && (
                <div className="bg-rose-950/40 border border-rose-500/30 p-5 rounded-2xl flex items-center justify-between relative z-10 overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />
                    <div className="pl-4">
                        <h4 className="font-bold text-rose-300 text-sm flex items-center gap-2">
                            <AlertTriangle size={16} /> Alerte de Surcharge Mentale
                        </h4>
                        <p className="text-xs text-rose-200/70 mt-1 mb-3">
                            Le système préconise une phase de recul alchimique.
                        </p>
                        <button 
                            onClick={handleStaseActivation}
                            className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/50 text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
                        >
                            Activer la Stase
                        </button>
                    </div>
                    <div className="text-right flex flex-col items-end">
                        <span className="text-3xl font-mono font-black text-rose-400">
                            {report.staseTimeMinutes} <span className="text-sm font-sans text-rose-500">min</span>
                        </span>
                        <span className="block text-[10px] text-rose-500/70 uppercase tracking-widest font-bold mt-1">
                            Temps Requis
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};