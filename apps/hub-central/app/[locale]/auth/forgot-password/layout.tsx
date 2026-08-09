// apps/hub-central/app/[locale]/auth/forgot-password/layout.tsx
'use client';

import React from 'react';
import { Compass } from 'lucide-react';

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#05070A] text-slate-100 flex flex-col justify-between p-6 relative overflow-hidden">
      
      {/* 🌌 Arrière-plan subtil / Ambiance stellaire */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(229,72,77,0.05)_0,transparent_70%)] pointer-events-none" />

      {/* En-tête minimaliste */}
      <header className="max-w-7xl mx-auto w-full flex items-center justify-between z-10 py-4">
        <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
          <Compass size={16} className="text-[#E5484D] animate-pulse" />
          <span>Secteur d'Authentification / Signal de Secours</span>
        </div>
      </header>

      {/* Contenu principal de la page */}
      <main className="z-10 flex-1 flex items-center justify-center">
        {children}
      </main>

      {/* Pied de page discret */}
      <footer className="text-center py-6 text-[10px] font-mono text-slate-600 z-10">
        Îlot Zoizos &bull; Protocole de Récupération Synaptique &lt;(:&lt;
      </footer>
    </div>
  );
}