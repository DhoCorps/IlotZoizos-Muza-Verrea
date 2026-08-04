import React from 'react';

export const metadata = {
  title: 'Atomik-K-Fard(e) | Îlot Zoizos',
  description: 'Wargame tactique de cartes et de conquête territoriale.',
};

export default function AtomikLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0b0c10] text-slate-200 selection:bg-purple-500/30">
      <header className="w-full border-b border-purple-500/20 bg-black/60 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-[0_0_15px_rgba(138,43,226,0.1)]">
        <div className="flex items-center gap-3">
          <span className="text-2xl drop-shadow-[0_0_8px_rgba(138,43,226,0.8)]">☢️</span>
          <span className="font-mono font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
            ATOMIK-K-FARD(E)
          </span>
        </div>
        <div className="text-xs font-mono text-purple-400/60 uppercase tracking-widest">
          Zone de Confinement
        </div>
      </header>
      <main className="p-4 md:p-8 flex flex-col items-center justify-center">
        {children}
      </main>
    </div>
  );
}