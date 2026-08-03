// apps/hub-central/app/[locale]/(inceptions)/marketPlace/layout.tsx
import React from 'react';

export const metadata = {
  title: 'Marketplace | Îlot Zoizos',
  description: 'Le grand marché des artefacts, créations et échanges de la volière.',
};

export default function MarketPlaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="relative w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Vous pouvez ajouter ici des éléments structurels globaux au marketplace (ex: sous-menu, fil d'Ariane, écho de navigation) */}
      <div className="flex-1 w-full">
        {children}
      </div>
    </section>
  );
}