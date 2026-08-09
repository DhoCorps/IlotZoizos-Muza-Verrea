// apps/hub-central/app/[locale]/auth/reset-password/layout.tsx
'use client';

import React from 'react';
import { KeyRound } from 'lucide-react';

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#05070A] text-slate-100 flex flex-col justify-between p-6 relative overflow-hidden">
      
      {/* Arrière-plan atmosphérique */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(229,72,77,0.06)_0,transparent_70%)] pointer-events-none" />

      {/* En-tête minimaliste */}
      <header className="max-w-7xl mx-auto w-full flex items-center justify-center z-15 py-4">
        <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
          <KeyRound size={16} className="text-[#E5484D] animate-pulse" />
          <span>Secteur de Régénération Synaptique</span>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="z-10 flex-1 flex items-center justify-center">
        {children}
      </main>

      {/* Pied de page */}
      <footer className="text-center py-6 text-[10px] font-mono text-slate-600 z-10 uppercase tracking-widest">
        Îlot Zoizos &bull; Réinitialisation du Chant &lt;(:&lt;
      </footer>
    </div>
  );
}