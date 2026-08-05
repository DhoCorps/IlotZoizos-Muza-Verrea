import React from 'react';

export const metadata = {
  title: 'Ciné-Quizz-Ciné-Max | Îlot Zoizos',
  description: 'Le projecteur s’allume. Enquêtez, coopérez et buzzez !',
};

// La classe "dark" est supprimée de html car on ne peut pas redéfinir html ici
// On englobe dans une div ayant le fond désiré
export default function CineMaxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#0A0D14] text-slate-100 min-h-screen selection:bg-emerald-500 selection:text-black antialiased font-sans">
      
      {/* En-tête discret de la canopée */}
      <header className="w-full border-b border-slate-800/60 bg-black/40 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <span className="text-xl">🎬</span>
          <span className="font-mono font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            Ciné-Quizz-Ciné-Max
          </span>
        </div>
        <div className="text-xs font-mono text-slate-500">
          Îlot Zoizos • Édition 2026
        </div>
      </header>

      {/* Contenu principal de la salle de cinéma */}
      <div className="flex flex-col items-center justify-center p-4 md:p-8">
        {children}
      </div>

    </div>
  );
}