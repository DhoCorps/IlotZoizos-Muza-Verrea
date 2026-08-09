// apps/hub-central/app/[locale]/(inceptions)/abyss-blog/layout.tsx
'use client';

import React from 'react';
import { BookOpen, Sparkles } from 'lucide-react';

export default function AbyssBlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#05070A] text-slate-100 p-6 md:p-12 relative overflow-hidden">
      
      {/* Aura Bio-Tech de fond */}
      <div className="absolute top-0 right-1/4 w-[800px] h-[500px] bg-cyan-900/5 blur-[150px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        {/* En-tête global d'AbyssBlog */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="space-y-1">
            <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-[10px] font-black text-cyan-400 uppercase tracking-widest inline-flex items-center gap-1.5 font-mono">
              <BookOpen size={12} /> Chroniques & Profondeurs
            </span>
            <h1 className="text-3xl font-black uppercase tracking-tight text-white">
              AbyssBlog
            </h1>
          </div>
        </header>

        {/* Contenu de la sous-page (Dashboard / Atelier) */}
        <main>{children}</main>
      </div>
    </div>
  );
}