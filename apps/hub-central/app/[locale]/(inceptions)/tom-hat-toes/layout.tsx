// apps/hub-central/app/[locale]/(inceptions)/tom-hat-toes/layout.tsx
'use client';

import React from 'react';
import { Target } from 'lucide-react';

export default function TomHatToesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#05070A] text-slate-100 flex flex-col relative overflow-hidden">
      {/* Aura Bio-Tech de fond */}
      <div className="absolute top-0 right-0 w-[800px] h-[600px] bg-[#E5484D]/5 blur-[180px] rounded-full pointer-events-none -z-10" />

      {/* En-tête global du Nexus */}
      <header className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-md z-20">
        <div className="flex items-center gap-2">
          <Target className="text-[#E5484D]" size={18} />
          <span className="font-black uppercase text-xs tracking-widest text-white">Tom-Hat-Toes Nexus</span>
        </div>
      </header>

      <main className="flex-1 w-full mx-auto">
        {children}
      </main>
    </div>
  );
}