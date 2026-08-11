// apps/hub-central/app/[locale]/(inceptions)/canopy-bank/layout.tsx
import React from 'react';
import Sidebar from '@/components/navigation/Sidebar';

export default function CanopyBankLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* Barre latérale de l'Îlot */}
      <Sidebar />
      
      {/* Contenu principal de la Banque */}
      <main className="flex-1 pl-28 pr-8 py-8">
        {children}
      </main>
    </div>
  );
}