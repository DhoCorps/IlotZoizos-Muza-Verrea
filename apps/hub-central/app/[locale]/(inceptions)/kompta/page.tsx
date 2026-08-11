'use client';

import React from 'react';
import { KomptaDashboard } from '@/components/kompta/DashBoard';
import { CanopySubsidySection } from '@/components/canopy/CanopySubsidySection';
import { usePageChapeauContext } from '@/hooks/usePageChapeauContext';

export default function KomptaInceptionPage() {
  // Synchronisation du contexte du Chapeau pour la page de comptabilité
  usePageChapeauContext({
    recipientUid: 'canopy_kompta_treasury',
    recipientPseudo: 'Trésorerie Kompta',
    targetTitle: 'Grand Livre & Comptabilité',
  });

  return (
    <main className="min-h-screen bg-[#05070A] text-slate-100 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Tableau de bord financier / Grand Livre */}
        <KomptaDashboard />

        {/* Guichet des subventions de la Canopée */}
        <CanopySubsidySection />
      </div>
    </main>
  );
}