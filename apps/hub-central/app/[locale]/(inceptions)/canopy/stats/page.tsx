import React from 'react';
import { Metadata } from 'next';
import CanopyStatsDashboard, { CanopyStatsSnapshot } from '@/components/canopy/CanopyStatsDashBoard';
import { getCachedCanopyStats } from '@/lib/cache/canopy.cache';

// 📊 Helper sécurisé pour récupérer le snapshot des statistiques de la Canopée
async function getStatsData(): Promise<CanopyStatsSnapshot | null> {
  try {
    const latestBroadcast = await getCachedCanopyStats();
    if (!latestBroadcast || !latestBroadcast.metadata || typeof latestBroadcast.metadata !== 'object') {
      return null;
    }
    const metadata = latestBroadcast.metadata as Record<string, unknown>;
    if (!('statsSnapshot' in metadata) || !metadata.statsSnapshot) {
      return null;
    }
    const snapshot = metadata.statsSnapshot as CanopyStatsSnapshot;
    return {
      ...snapshot,
      broadcastedAt: (latestBroadcast as any).createdAt ? new Date((latestBroadcast as any).createdAt).toISOString() : undefined
    };
  } catch {
    return null;
  }
}

// 🌐 Génération dynamique des métadonnées SEO (ex: "Bilan - Août 2026")
export async function generateMetadata(): Promise<Metadata> {
  const stats = await getStatsData();
  const periodLabel = stats?.yearMonth || 'Actuel';
  
  return {
    title: `Bilan - ${periodLabel} | Le Bilan de la Canopée`,
    description: `Consultez les grands marchands, l'Oiseau Écho et le volume global des échanges pour la période ${periodLabel}.`,
    openGraph: {
      title: `Bilan - ${periodLabel} | Le Bilan de la Canopée`,
      description: `Consultez les statistiques et la régulation de la canopée pour la période ${periodLabel}.`,
      type: 'website',
    }
  };
}

export default async function CanopyStatsPage() {
  // 🌿 Fetch SSR des statistiques de la Canopée avant le rendu
  const stats = await getStatsData();

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-4xl mx-auto mb-8 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight mb-2 flex items-center justify-center gap-3">
          <span>🗞️</span> Chroniques de la Canopée
        </h1>
        <p className="text-slate-400 text-sm">
          L'écho mensuel des flux et des résonances de l’Îlot, scellé dans le grand livre.
        </p>
      </div>

      {/* Dashboard client hydraté avec les données SSR */}
      <CanopyStatsDashboard initialStats={stats} />
    </div>
  );
}