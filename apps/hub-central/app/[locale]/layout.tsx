// apps/hub-central/app/[locale]/(app)/layout.tsx
'use client';

import React from 'react';
import { Compass, Sparkles } from 'lucide-react';
import { Link } from '@/navigation';

export default function AppRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#05070A] text-slate-100 flex flex-col justify-between selection:bg-[#E5484D] selection:text-white">
      
      {/* 🌌 Barre de navigation supérieure globale pour l'application */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#05070A]/80 border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E5484D] animate-ping" />
            <span className="font-black tracking-tighter uppercase text-sm text-white group-hover:text-[#E5484D] transition-colors">
              Îlot Zoizos
            </span>
          </Link>
          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-emerald-400">
              <Sparkles size={12} /> Matrice Synaptique Active
            </span>
          </div>
        </div>
      </header>

      {/* Contenu principal de l'application (la HomePage et les sous-routes) */}
      <main className="flex-1">
        {children}
      </main>

      {/* Pied de page global */}
      <footer className="border-t border-white/5 py-8 px-6 bg-black/40 text-center text-xs font-mono text-slate-600">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>Îlot Zoizos &bull; Écosystème Souverain</span>
          <span className="text-[10px] text-slate-500">&lt;(:&lt; &bull; Tous droits réservés</span>
        </div>
      </footer>

    </div>
  );
}