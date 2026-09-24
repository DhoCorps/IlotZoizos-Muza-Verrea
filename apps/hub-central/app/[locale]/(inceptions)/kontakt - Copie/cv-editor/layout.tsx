// apps/hub-central/app/[locale]/(inceptions)/kontakt/cv-editor/layout.tsx
import React from 'react';

export default function CVEditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-[#0A0D14] text-white overflow-x-hidden">
      {/* Grille d'arrière-plan thématique */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      
      <div className="relative z-10 py-6 px-4 md:px-8">
        {children}
      </div>
    </div>
  );
}