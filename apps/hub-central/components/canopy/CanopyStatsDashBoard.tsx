'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';

export interface CanopyStatsSnapshot {
  yearMonth: string;
  macroTotals: {
    totalVolumeCents: number;
    transactionCount: number;
    [key: string]: any;
  };
  topSellers: Array<{ _id: string; totalVolumeCents: number; [key: string]: any }>;
  topBuyers: any[];
  mostCommented: Array<{ _id: string; commentCount: number; [key: string]: any }>;
  mostReactive: any[];
  broadcastedAt?: string;
}

interface CanopyStatsDashboardProps {
  initialStats?: CanopyStatsSnapshot | null;
}

export default function CanopyStatsDashboard({ initialStats }: CanopyStatsDashboardProps) {
  // 🌿 Fetch hydraté (TanStack Query) avec extraction unifiée de l'erreur API
  const { data: stats, isLoading, isError } = useQuery<CanopyStatsSnapshot>({
    queryKey: ['canopy-stats'],
    queryFn: async () => {
      const res = await fetch('/api/canopy/stats');
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || "Erreur de chargement des statistiques.");
      }
      return data;
    },
    initialData: initialStats || undefined,
    staleTime: 1000 * 60 * 60, // Cache de 1 heure
  });

  if (isLoading && !stats) return <div className="p-6 text-center text-gray-400 animate-pulse">✨ Écoute de la canopée en cours...</div>;
  if (isError || !stats) return <div className="p-6 text-center text-gray-500 border border-dashed border-slate-800 rounded-xl">La canopée est silencieuse ce mois-ci.</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 shadow-2xl">
      <div className="border-b border-slate-800 pb-4 mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <span>🗞️</span> Le Bilan de la Canopée — <span className="text-amber-400">{stats.yearMonth}</span>
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Volume global des échanges : <strong className="text-emerald-400">{(stats.macroTotals.totalVolumeCents / 100).toFixed(2)} €</strong> ({stats.macroTotals.transactionCount} transactions)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Vendeurs */}
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 hover:border-amber-500/30 transition-colors">
          <h3 className="text-lg font-semibold text-amber-300 mb-3 flex items-center gap-2">👑 Grand Marchand</h3>
          {stats.topSellers.length > 0 ? (
            <ul>
              {stats.topSellers.map((seller, idx: number) => (
                <li key={seller._id} className="flex justify-between py-1.5 text-sm border-b border-slate-700/30 last:border-0">
                  <span className="text-slate-300">#{idx + 1} Oiseau <span className="text-slate-500 text-xs">({seller._id.slice(0, 8)}...)</span></span>
                  <span className="font-mono text-emerald-400 font-medium">{(seller.totalVolumeCents / 100).toFixed(2)} €</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">Aucun échange enregistré.</p>
          )}
        </div>

        {/* Oiseau Écho */}
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 hover:border-sky-500/30 transition-colors">
          <h3 className="text-lg font-semibold text-sky-300 mb-3 flex items-center gap-2">💬 L'Oiseau Écho</h3>
          {stats.mostCommented.length > 0 ? (
            <ul>
              {stats.mostCommented.map((echo, idx: number) => (
                <li key={echo._id} className="flex justify-between py-1.5 text-sm border-b border-slate-700/30 last:border-0">
                  <span className="text-slate-300">#{idx + 1} Oiseau <span className="text-slate-500 text-xs">({echo._id.slice(0, 8)}...)</span></span>
                  <span className="font-mono text-sky-400 font-medium">{echo.commentCount} commentaires</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">Aucun commentaire marquant.</p>
          )}
        </div>
      </div>
    </div>
  );
}