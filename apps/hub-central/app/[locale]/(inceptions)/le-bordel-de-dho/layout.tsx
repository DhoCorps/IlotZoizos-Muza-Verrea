// apps/hub-central/app/[locale]/(inceptions)/marchand/layout.tsx
'use client';

import React from 'react';
import { Store } from 'lucide-react';

export default function MarchandLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#05070A] text-slate-100 p-6 md:p-12 relative overflow-x-hidden">
      
      {/* Aura Bio-Tech */}
      <div className="absolute top-0 right-1/3 w-[700px] h-[500px] bg-cyan-500/5 blur-[160px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        {/* En-tête global du Marchand */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="space-y-1">
            <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-[10px] font-black text-cyan-400 uppercase tracking-widest inline-flex items-center gap-1.5 font-mono">
              <Store size={12} /> Économie Souveraine
            </span>
            <h1 className="text-3xl font-black uppercase tracking-tight text-white">
              Comptoir du Marchand
            </h1>
          </div>
        </header>

        {/* Contenu principal */}
        <main>{children}</main>
      </div>
    </div>
  );
}