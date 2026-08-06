import React from 'react';

export const metadata = {
  title: 'Hall of Fame | Îlot Zoizos',
  description: 'Les meilleurs exploits des oiseaux à travers les dimensions de l’Îlot.',
};

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#05070A] text-slate-100 flex flex-col">
      <header className="w-full border-b border-slate-800/60 bg-black/40 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <span className="text-xl">🏆</span>
          <span className="font-mono font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500">
            Hall of Fame
          </span>
        </div>
        <div className="text-xs font-mono text-slate-500">
          Archives officielles • Îlot Zoizos
        </div>
      </header>
      <main className="flex-1 p-4 md:p-8 flex flex-col items-center">
        {children}
      </main>
    </div>
  );
}