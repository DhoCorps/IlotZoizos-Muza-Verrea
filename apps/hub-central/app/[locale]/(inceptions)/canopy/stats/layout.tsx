// apps/hub-central/app/inception/canopy/stats/layout.tsx
import React, { ReactNode } from 'react';
import { ResourceBadge } from '@/components/global/ResourceBadge';

export interface CanopyStatsLayoutProps {
  children: ReactNode;
}

export default function CanopyStatsLayout({ children }: CanopyStatsLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4">
      <header className="max-w-4xl mx-auto mb-8 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-amber-400 flex items-center justify-center gap-2">
          <span>🦅</span> Sanctuaire de la Canopée
        </h1>
        <p className="text-sm text-slate-400 mt-2">
          Observation des flux, des résonances et des moissons mensuelles de l'Îlot Zoizos.
        </p>

        {/* 🌿 Ruban des Actifs Souverains de la Canopée (Intégration du ResourceBadge) */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          <ResourceBadge type="TOX" amount={14250} size="sm" />
          <ResourceBadge type="DHO" amount={890} size="sm" />
          <ResourceBadge type="KAOS" amount={53200} size="sm" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto">{children}</main>
    </div>
  );
}