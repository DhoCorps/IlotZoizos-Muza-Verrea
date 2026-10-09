import React from 'react';

export default function SamplotekLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto mb-8 border-b border-slate-800 pb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🎛️</span>
          <div>
            <h1 className="text-2xl font-serif font-bold text-slate-100">Studio SamploTek</h1>
            <p className="text-xs text-slate-400">Canal de synthèse, rythmiques asynchrones et gravure de sillons</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 font-mono">
          <span>Canopée / Îlot Zoizos</span>
        </div>
      </div>

      <main>{children}</main>
    </div>
  );
}