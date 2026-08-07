// apps/hub-central/app/[locale]/(inceptions)/salon/layout.tsx
import React from 'react';
import Sidebar from '@/components/navigation/Sidebar';

export default function SalonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-screen bg-zinc-950 overflow-hidden">
      {/* La Sidebar fixe de l'Îlot */}
      <Sidebar />
      
      {/* Zone principale du Salon Privé E2EE */}
      <main className="flex-1 pl-20 md:pl-28 pr-4 py-4 h-full overflow-y-auto flex flex-col">
        {children}
      </main>
    </div>
  );
}