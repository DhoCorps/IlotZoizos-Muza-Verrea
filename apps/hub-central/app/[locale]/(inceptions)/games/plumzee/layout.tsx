import React from 'react';

export const metadata = {
  title: 'Plum’Zee | Îlot Zoizos',
  description: 'Le Yahtzee mystique et cosmique de l’Îlot Zoizos.',
};

export default function PlumZeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col">
      <header className="w-full border-b border-amber-500/20 bg-black/50 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <span className="text-xl">🎲</span>
          <span className="font-mono font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-emerald-400">
            Plum’Zee
          </span>
        </div>
        <div className="text-xs font-mono text-slate-500">
          Îlot Zoizos • Boulier des Dés Cosmiques
        </div>
      </header>
      <main className="flex-1 p-4 md:p-8 flex flex-col items-center justify-center">
        {children}
      </main>
    </div>
  );
}