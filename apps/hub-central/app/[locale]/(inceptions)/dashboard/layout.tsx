// apps/hub-central/app/[locale]/(inceptions)/dashboard/layout.tsx
import React from 'react';
import Sidebar from '@/components/navigation/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-screen bg-slate-900 overflow-hidden">
      {/* La Sidebar fixe de l'Îlot */}
      <Sidebar />
      
      {/* Zone principale du Dashboard, avec décalage pour la sidebar */}
      <main className="flex-1 pl-20 md:pl-28 pr-4 py-4 h-full overflow-y-auto flex flex-col">
        {children}
      </main>
    </div>
  );
}