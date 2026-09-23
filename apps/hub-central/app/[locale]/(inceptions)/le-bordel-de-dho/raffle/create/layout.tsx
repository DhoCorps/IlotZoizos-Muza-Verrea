'use client';

import React from 'react';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { Link } from '@/navigation';

export default function RaffleCreateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#05070A] text-slate-100 p-6 md:p-12 relative overflow-x-hidden">
      {/* Aura Bio-Tech */}
      <div className="absolute top-0 right-1/4 w-[700px] h-[500px] bg-amber-500/5 blur-[160px] rounded-full pointer-events-none -z-10" />
      
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
        {/* En-tête global de la Fondation de Loterie */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="space-y-1">
            <Link
              href="/marketplace"
              className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors mb-2"
            >
              <ArrowLeft size={14} /> Retour au Grand Bazar
            </Link>
            <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-[10px] font-black text-amber-400 uppercase tracking-widest inline-flex items-center gap-1.5 font-mono">
              <Sparkles size={12} /> Fondation de Loterie Souveraine
            </span>
            <h1 className="text-3xl font-black uppercase tracking-tight text-white">
              Sédimentation d'une Loterie
            </h1>
          </div>
        </header>
        
        {/* Contenu principal */}
        <main>{children}</main>
      </div>
    </div>
  );
}