// apps/hub-central/app/[locale]/(inceptions)/games/layout.tsx
import React from 'react';
import { GlobalBarterDrawer } from '@/components/global/GlobalBarterDrawer';

export default function GamesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-slate-950 text-white">
      {/* Contenu de la zone des jeux */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Le Comptoir de Barter global pour tous les mini-jeux de la zone */}
      <GlobalBarterDrawer currentGameId="games-canopy-hub" />
    </div>
  );
}