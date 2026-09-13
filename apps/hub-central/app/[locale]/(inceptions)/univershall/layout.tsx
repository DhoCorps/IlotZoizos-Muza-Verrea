// apps/hub-central/app/[locale]/(inceptions)/univershall/layout.tsx
import React from 'react';
import { Toaster } from 'sonner';

export const metadata = {
  title: "Univers'Hall | L'Agora Centrale de l'Îlot Zoizos",
  description: "Le point de convergence de tous les modules, flux transversaux et panthéons de la canopée.",
};

export default function UniversHallLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      <Toaster position="bottom-right" theme="dark" richColors />
      <main className="flex-1 flex flex-col py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}