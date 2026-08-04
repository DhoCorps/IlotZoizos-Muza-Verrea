// apps/hub-central/app/[locale]/(inceptions)/games/soonart/layout.tsx
import React from 'react';

export const metadata = {
  title: 'Soon’Art | Îlot Zoizos',
  description: 'Le démineur artistique par triangulation et cercles de densité.',
};

export default function SoonArtLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  return (
    <div className="min-h-screen bg-[#0A0D14] text-slate-100">
      <header className="w-full border-b border-slate-800/60 bg-black/40 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <span className="text-xl">🎨</span>
          <span className="font-mono font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-rose-400">
            Soon’Art
          </span>
        </div>
        <div className="text-xs font-mono text-slate-500">
          Îlot Zoizos • Édition 2026
        </div>
      </header>
      <main className="p-4 md:p-8 flex flex-col items-center justify-center">
        {children}
      </main>
    </div>
  );
}