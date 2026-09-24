'use client';

import React, { useState } from 'react';
import { KomptaDashboard } from '@/components/kompta/DashBoard';
import { CanopySubsidySection } from '@/components/canopy/CanopySubsidySection';
import { usePageChapeauContext } from '@/hooks/usePageChapeauContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export default function KomptaInceptionPage() {
  // 1. Initialisation stable du client React Query pour le tableau de bord ERP
  // Le useState garantit que le client n'est pas recréé à chaque rendu du composant
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // Les données sont fraîches pendant 1 minute
        refetchOnWindowFocus: false, // Évite de surcharger l'API en changeant d'onglet
      },
    },
  }));

  // 2. Synchronisation du contexte du Chapeau pour la page de comptabilité
  usePageChapeauContext({
    recipientUid: 'canopy_kompta_treasury',
    recipientPseudo: 'Trésorerie Kompta',
    targetTitle: 'Grand Livre & Comptabilité',
  });

  return (
    <QueryClientProvider client={queryClient}>
      {/* 🚀 MISE EN PAGE ÉLARGIE : max-w-[1400px] pour laisser respirer l'analytique ERP */}
      <main className="min-h-screen bg-[#05070A] text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1400px] mx-auto space-y-16">
          
          {/* Section 1 : Tableau de bord financier & ERP */}
          <section className="w-full">
            <KomptaDashboard />
          </section>

          {/* Ligne de séparation visuelle pour marquer le changement de contexte */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent opacity-50" />

          {/* Section 2 : Guichet des subventions de la Canopée (Centré et plus resserré) */}
          <section className="w-full max-w-5xl mx-auto">
            <CanopySubsidySection />
          </section>

        </div>
      </main>
    </QueryClientProvider>
  );
}