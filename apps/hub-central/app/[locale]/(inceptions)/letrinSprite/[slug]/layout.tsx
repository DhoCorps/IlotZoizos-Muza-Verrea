'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

export default function LetrInDetailLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#05070A] text-slate-100 p-6 md:p-12 relative overflow-x-hidden">
      <div className="absolute top-0 right-1/3 w-[700px] h-[500px] bg-red-900/10 blur-[160px] rounded-full pointer-events-none -z-10" />
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="space-y-1">
            <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest inline-flex items-center gap-1.5 font-mono">
              <Sparkles size={12} /> Sanctuaire Typographique & Constellation
            </span>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}