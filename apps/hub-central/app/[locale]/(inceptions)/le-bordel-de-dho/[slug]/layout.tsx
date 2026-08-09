// apps/hub-central/app/[locale]/(inceptions)/ecommerce/[slug]/layout.tsx
'use client';

import React from 'react';
import { Package } from 'lucide-react';

export default function ProductDetailLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#05070A] text-slate-100 p-6 md:p-12 relative overflow-x-hidden">
      
      {/* Aura Bio-Tech de fond */}
      <div className="absolute top-0 right-0 w-[800px] h-[500px] bg-red-900/5 blur-[160px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        {/* En-tête global de la fiche produit */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="space-y-1">
            <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest inline-flex items-center gap-1.5 font-mono">
              <Package size={12} /> Résonance du Produit
            </span>
            <h1 className="text-3xl font-black uppercase tracking-tight text-white">
              Détails de l'Artefact
            </h1>
          </div>
        </header>

        {/* Contenu principal */}
        <main>{children}</main>
      </div>
    </div>
  );
}