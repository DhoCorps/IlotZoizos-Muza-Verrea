// apps/hub-central/app/[locale]/marketplace/layout.tsx
import { ReactNode } from 'react';

export default function MarketplaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#05070A] text-slate-200 flex flex-col selection:bg-[#E5484D]/30 selection:text-white relative overflow-hidden">
      
      {/* 🌌 Lueur d'ambiance crépusculaire en arrière-plan */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-[#E5484D]/5 blur-[140px] pointer-events-none rounded-full" />

      {/* Contenu de la Marketplace */}
      <main className="flex-1 relative z-10">
        {children}
      </main>

    </div>
  );
}