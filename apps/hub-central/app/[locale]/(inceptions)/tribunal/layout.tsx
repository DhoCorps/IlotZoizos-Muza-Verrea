// app/[locale]/(inceptions)/tribunal/layout.tsx
import React from 'react';
import { Toaster } from 'sonner';

export const metadata = {
  title: 'Le Tribunal de la Canopée • L’Îlot Zoizos',
  description: 'Espace de justice souveraine et de régulation karmique de l’Îlot.',
};

export default function TribunalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-rose-500 selection:text-white">
      {/* Notifications globales de la Canopée */}
      <Toaster position="bottom-right" theme="dark" richColors />
      
      {/* Contenu principal du Tribunal */}
      <main className="flex-1 flex flex-col py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full space-y-8">
        <header className="border-b border-slate-800 pb-6 text-center">
          <span className="px-3 py-1 bg-rose-950/40 border border-rose-900/50 rounded-full text-[10px] font-black text-rose-300 uppercase tracking-widest">
            Zone Souveraine de l'Architecte
          </span>
          <h1 className="text-3xl font-black tracking-wider uppercase text-slate-100 mt-3">
            Le Tribunal de la Canopée
          </h1>
          <p className="text-sm font-mono text-slate-400 mt-2 max-w-xl mx-auto">
            Là où les dissonances se résolvent par le maillage du Graphe, la convocation des jurés impartiaux et le poids des Grâces karmiques.
          </p>
        </header>

        {children}
      </main>
    </div>
  );
}