// apps/hub-central/app/[locale]/auth/login/layout.tsx
'use client';

import React from 'react';
import { Bird } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#05070A] text-slate-100 flex flex-col justify-center relative overflow-hidden">
      
      {/* Arrière-plan atmosphérique */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(229,72,77,0.08)_0,transparent_70%)] pointer-events-none" />

      {/* En-tête minimaliste */}
      <header className="absolute top-0 w-full z-10 p-6 flex justify-center">
        <div className="flex items-center gap-2 font-black tracking-widest uppercase text-xs text-slate-500">
          <Bird size={16} className="text-[#E5484D]" />
          <span>Îlot Zoizos</span>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="z-10 w-full">
        {children}
      </main>

      {/* Pied de page */}
      <footer className="absolute bottom-6 w-full text-center text-[9px] font-mono text-slate-600 z-10 uppercase tracking-widest">
        Accès restreint aux membres de la volée &bull; v1.0
      </footer>
    </div>
  );
}