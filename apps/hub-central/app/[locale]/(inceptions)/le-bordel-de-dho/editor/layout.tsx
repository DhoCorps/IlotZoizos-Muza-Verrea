// apps/hub-central/app/[locale]/(inceptions)/ecommerce/editor/layout.tsx
import React from 'react';

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 relative overflow-x-hidden selection:bg-[#E5484D] selection:text-white">
      
      {/* 🌌 Effets de fond permanents (Atmosphère de l'Îlot) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#E5484D]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Contenu principal de l'éditeur */}
      <main className="relative z-10 px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

    </div>
  );
}