// apps/hub-central/app/[locale]/(inceptions)/kompta/page.tsx
'use client';

import React from 'react';
import { KomptaDashboard } from '@/components/kompta/DashBoard';
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
      <KomptaDashboard />
    </main>
  );
}