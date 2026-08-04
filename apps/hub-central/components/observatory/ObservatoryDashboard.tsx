// apps/hub-central/components/observatory/ObservatoryDashboard.tsx
'use client';

import React from 'react';
import { VibratoryReport } from '@ilot/shared-core';

interface ObservatoryDashboardProps {
    report: VibratoryReport;
    birdName: string;
}

export const ObservatoryDashboard: React.FC<ObservatoryDashboardProps> = ({ report, birdName }) => {
    const containerBg = report.isVolièreHealthy ? 'bg-[#1a2129]' : 'bg-[#2b1616]';
    const borderColor = report.isVolièreHealthy ? 'border-[#3a4654]' : 'border-[#6b2a2a]';
    const frequencyColor = report.frequencyHz > 600 ? 'text-[#8ab4f8]' : 'text-[#ff6b6b]';

    const handleStaseActivation = () => {
        console.log("Le flux de l'Oiseau est mis en stase alchimique.");
    };

    return (
        <div className={`p-6 rounded-xl border ${borderColor} ${containerBg} text-slate-200 shadow-2xl transition-all duration-500`}>
            <div className="flex justify-between items-center mb-6 border-b border-slate-700/50 pb-4">
                <div>
                    <h2 className="text-xl font-bold tracking-wide">Observatoire des Fréquences</h2>
                    <p className="text-sm text-slate-400">Analyse vibratoire de l'Oiseau : <span className="text-slate-200 font-semibold">{birdName}</span></p>
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider bg-slate-800 border border-slate-700">
                    {report.aura}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800 text-center">
                    <span className="block text-xs text-slate-400 uppercase tracking-wider mb-1">Fréquence Vibratoire</span>
                    <span className={`text-3xl font-extrabold font-mono ${frequencyColor}`}>{report.frequencyHz} Hz</span>
                </div>

                <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800 text-center">
                    <span className="block text-xs text-slate-400 uppercase tracking-wider mb-1">Balance Vitale (&Lambda;)</span>
                    <span className={`text-3xl font-extrabold font-mono ${report.vitalBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {report.vitalBalance > 0 ? `+${report.vitalBalance}` : report.vitalBalance}
                    </span>
                </div>

                <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800 text-center">
                    <span className="block text-xs text-slate-400 uppercase tracking-wider mb-1">Flux de Sève (It)</span>
                    <span className={`text-3xl font-extrabold font-mono ${report.irrigationStatus === 1 ? 'text-cyan-400' : 'text-rose-600 animate-pulse'}`}>
                        {report.irrigationStatus === 1 ? 'ACTIF' : 'ROMPU'}
                    </span>
                </div>
            </div>

            {report.staseTimeMinutes > 15 && (
                <div className="bg-rose-950/40 border border-rose-900/50 p-4 rounded-lg flex items-center justify-between">
                    <div>
                        <h4 className="font-semibold text-rose-300 text-sm">Alerte de Surcharge Mentale</h4>
                        <p className="text-xs text-slate-300 mb-2">Le système préconise une phase de recul alchimique.</p>
                        <button 
                            onClick={handleStaseActivation}
                            className="px-3 py-1 bg-rose-800 hover:bg-rose-700 text-white text-xs rounded-md transition-colors shadow"
                        >
                            Activer la Stase
                        </button>
                    </div>
                    <div className="text-right">
                        <span className="text-lg font-mono font-bold text-rose-400">{report.staseTimeMinutes} min</span>
                        <span className="block text-[10px] text-slate-400 uppercase">Temps de Stase</span>
                    </div>
                </div>
            )}
        </div>
    );
};