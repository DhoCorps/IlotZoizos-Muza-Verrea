// apps/hub-central/app/[locale]/auth/register/layout.tsx
'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#05070A] text-slate-100 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      
      {/* Arrière-plan atmosphérique */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(16,185,129,0.06)_0,transparent_70%)] pointer-events-none" />

      {/* En-tête */}
      <div className="z-10 mb-8 text-center space-y-2">
        <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-[10px] font-black text-emerald-400 uppercase tracking-widest inline-flex items-center gap-1.5">
          <Sparkles size={12} /> Naissance dans la Volière
        </span>
        <h1 className="text-3xl font-black uppercase tracking-tight text-white">
          Fondation du Nid
        </h1>
      </div>

      {/* Contenu de la page (Le Formulaire) */}
      <main className="z-10 w-full max-w-md bio-card p-8 bg-slate-900/40 border border-slate-800 rounded-3xl backdrop-blur-xl shadow-2xl">
        {children}
      </main>

      {/* Pied de page */}
      <footer className="z-10 mt-8 text-[10px] font-mono text-slate-600 uppercase tracking-widest">
        Îlot Zoizos &bull; Protocole d'Inscription Synaptique &lt;(:&lt;
      </footer>
    </div>
  );
}