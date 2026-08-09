// apps/hub-central/app/archives/layout.tsx
'use client';

import React from 'react';
import { Database, Sparkles } from 'lucide-react';

export default function ArchivesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 relative pb-32">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        {/* En-tête de section Archives */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="space-y-1">
            <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-[10px] font-black text-emerald-400 uppercase tracking-widest inline-flex items-center gap-1.5">
              <Database size={12} /> Mémoire Profonde
            </span>
            <h1 className="text-3xl font-black uppercase tracking-tight text-white">
              Sanctuaire des Archives
            </h1>
          </div>
        </div>

        {/* Contenu de la page d'archives */}
        <main>{children}</main>
      </div>
    </div>
  );
}