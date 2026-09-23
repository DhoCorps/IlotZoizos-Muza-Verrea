// apps/hub-central/app/[locale]/(inceptions)/store/[slug]/layout.tsx
'use client';

import React from 'react';
import { Store, ArrowLeft } from 'lucide-react';
import { Link } from '@/navigation';

export default function StoreDetailLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#05070A] text-slate-100 p-6 md:p-12 relative overflow-x-hidden">
      
      {/* 🌟 Aura Bio-Tech de fond (Harmonisée avec l'écosystème marchand)[cite: 10] */}
      <div className="absolute top-0 right-1/3 w-[700px] h-[500px] bg-cyan-500/5 blur-[160px] rounded-full pointer-events-none -z-10" />
      
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        {/* En-tête global de navigation et de contexte de la boutique[cite: 10] */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="space-y-2">
            <Link href="/marketplace" className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors">
              <ArrowLeft size={14} /> Retour au Grand Bazar
            </Link>
            <div className="flex items-center gap-2 pt-1">
              <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-[10px] font-black text-cyan-400 uppercase tracking-widest inline-flex items-center gap-1.5 font-mono">
                <Store size={12} /> Comptoir Souverain de l'Îlot
              </span>
            </div>
          </div>
        </header>

        {/* Contenu principal de la boutique ([slug]/page.tsx)[cite: 10] */}
        <main>{children}</main>
      </div>
    </div>
  );
}