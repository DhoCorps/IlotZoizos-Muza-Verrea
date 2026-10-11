// apps/hub-central/app/[locale]/(inceptions)/kontakt/profiles/[slug]/layout.tsx
import React from 'react';

export default function KontaktProfileDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-[80vh] text-white overflow-x-hidden">
      {/* Halo et grille synaptique d'arrière-plan dédiés à l'auscultation de profil */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#E5484D]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="relative z-10 py-2">
        {children}
      </div>
    </div>
  );
}