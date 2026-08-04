import React from 'react';

export const metadata = {
  title: 'Galak-T-K | Îlot Zoizos',
  description: 'Le déminage spatial et cosmique par déduction d’axes stellaires.',
};

export default function GalakTKLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100">
      <header className="w-full border-b border-purple-900/40 bg-black/50 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <span className="text-xl">🌌</span>
          <span className="font-mono font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
            Galak-T-K
          </span>
        </div>
        <div className="text-xs font-mono text-slate-500">
          Îlot Zoizos • Secteur Stellaire
        </div>
      </header>
      <main className="p-4 md:p-8 flex flex-col items-center justify-center">
        {children}
      </main>
    </div>
  );
}