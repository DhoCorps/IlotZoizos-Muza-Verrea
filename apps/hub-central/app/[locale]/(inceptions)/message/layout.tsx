// apps/hub-central/app/[locale]/(inceptions)/message/layout.tsx
import React from 'react';
import Sidebar from '../../../../components/navigation/Sidebar';

export default function MessageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-screen bg-zinc-950 overflow-hidden">
      {/* La Sidebar de l'Îlot fixe sur le côté */}
      <Sidebar />
      
      {/* Zone principale de la messagerie (décale légèrement le contenu pour laisser place à la sidebar fixe) */}
      <main className="flex-1 pl-20 md:pl-28 pr-4 py-4 h-full flex flex-col">
        {children}
      </main>
    </div>
  );
}