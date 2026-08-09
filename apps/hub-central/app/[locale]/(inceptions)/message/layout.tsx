// apps/hub-central/app/messages/layout.tsx
import React from 'react';
import { MessageSquareText, Sparkles } from 'lucide-react';

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-full bg-[#05070A] text-slate-100 flex flex-col overflow-hidden">
      
      {/* Barre supérieure minimaliste de la messagerie */}
      <header className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#E5484D]/10 border border-[#E5484D]/20 flex items-center justify-center">
            <MessageSquareText size={16} className="text-[#E5484D]" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-widest text-white">Canopée (Messagerie)</h1>
            <p className="text-[10px] font-mono text-slate-500 uppercase">Communication Synaptique</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">Canal Actif</span>
        </div>
      </header>

      {/* Zone de contenu principale */}
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>

    </div>
  );
}