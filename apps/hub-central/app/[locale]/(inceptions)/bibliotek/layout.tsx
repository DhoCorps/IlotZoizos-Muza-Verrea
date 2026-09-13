// apps/hub-central/app/[locale]/(inceptions)/bibliotek/layout.tsx
import React from 'react';
import { BookOpen } from 'lucide-react';
import { Toaster } from 'sonner';

export const metadata = {
  title: 'Bibliotek | Sanctuaire des Écrits Libres - Îlot Zoizos',
  description: 'Liseuse et atelier d’écriture souverains, éco-responsables et scellés par cryptographie SHA-256.',
};

export default function BibliotekLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#05070A] text-slate-100 flex flex-col relative overflow-hidden selection:bg-[#E5484D] selection:text-white">
      {/* Notifications globales de la Canopée */}
      <Toaster position="bottom-right" theme="dark" richColors />

      {/* Aura Bio-Tech de fond (Ton chaud crépusculaire / sans bleu) */}
      <div className="absolute top-0 right-0 w-[800px] h-[600px] bg-[#E5484D]/5 blur-[180px] rounded-full pointer-events-none -z-10" />

      {/* En-tête global du Nexus Bibliotek */}
      <header className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#E5484D]/10 border border-[#E5484D]/20 flex items-center justify-center">
            <BookOpen size={16} className="text-[#E5484D]" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-widest text-white">Bibliotek Nexus</h1>
            <p className="text-[10px] font-mono text-slate-500 uppercase">Le Sanctuaire des Écrits Libres</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#E5484D] animate-pulse" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#E5484D]">Sceau SHA-256 Actif</span>
        </div>
      </header>

      <main className="flex-1 w-full mx-auto">
        {children}
      </main>
    </div>
  );
}