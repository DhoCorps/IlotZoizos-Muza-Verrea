import React from 'react';

export const metadata = {
  title: 'Nexus des Jeux | Îlot Zoizos',
  description: 'Le hub central pour accéder à toutes les arènes ludiques de l’Îlot.',
};

export default function NexusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#05070A] text-slate-100 flex flex-col">
      <header className="w-full border-b border-slate-800/60 bg-black/40 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <span className="text-xl">🌌</span>
          <span className="font-mono font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            Nexus des Jeux
          </span>
        </div>
        <div className="text-xs font-mono text-slate-500">
          Terminal central • Accès autorisé
        </div>
      </header>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}