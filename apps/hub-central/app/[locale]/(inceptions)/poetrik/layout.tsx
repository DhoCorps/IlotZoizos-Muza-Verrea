// apps/hub-central/app/[locale]/(inceptions)/poetrik/layout.tsx
import React from 'react';
import { Toaster } from 'sonner';

export const metadata = {
  title: "Poetrik | Atelier Lyrique & Oracle Lexical - Îlot Zoizos",
  description: "Composition poétique multilingue, analyse de scansion et tissage de rimes dans le Graphe.",
};

export default function PoetrikLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#05070A] text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      <Toaster position="bottom-right" theme="dark" richColors />
      <header className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-serif font-bold">
            🪶
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-widest text-white">Poetrik Nexus</h1>
            <p className="text-[10px] font-mono text-slate-500 uppercase">Atelier Lyrique & Oracle de la Canopée</p>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full mx-auto p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}