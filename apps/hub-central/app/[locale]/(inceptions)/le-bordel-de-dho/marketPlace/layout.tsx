// apps/hub-central/app/[locale]/(inceptions)/marketPlace/layout.tsx
'use client';

import React from 'react';
import { Store } from 'lucide-react';

export default function MarketPlaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#05070A] text-slate-100 p-6 md:p-12 relative overflow-hidden">
      
      {/* Aura Bio-Tech */}
      <div className="absolute top-0 right-0 w-[800px] h-[500px] bg-emerald-900/10 blur-[160px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        {/* En-tête global du Marché */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="space-y-1">
            <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-[10px] font-black text-emerald-400 uppercase tracking-widest inline-flex items-center gap-1.5 font-mono">
              <Store size={12} /> Place de marché ouverte
            </span>
            <h1 className="text-3xl font-black uppercase tracking-tight text-white">
              Le Grand Bazar
            </h1>
          </div>
        </header>

        {/* Contenu principal */}
        <main>{children}</main>
      </div>
    </div>
  );
}