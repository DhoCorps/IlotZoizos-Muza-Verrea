// apps/hub-central/app/[locale]/(inceptions)/agora/layout.tsx
import React from 'react';

export const metadata = {
  title: 'Agora des Ondes | Îlot Zoizos',
  description: 'Le sanctuaire audiovisuel nocturne et permanent de la volière. Écoute, visionnage et résonance.',
};

export default function AgoraLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="relative w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      <div className="flex-1 w-full h-full">
        {children}
      </div>
    </section>
  );
}