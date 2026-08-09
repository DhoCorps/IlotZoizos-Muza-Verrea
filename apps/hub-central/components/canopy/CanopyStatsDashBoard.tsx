// apps/hub-central/components/CanopyStatsDashboard.tsx
'tsx'
import React, { useEffect, useState } from 'react';

export default function CanopyStatsDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/canopy/stats')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-center text-gray-400">Écoute de la canopée en cours...</div>;
  if (!stats) return <div className="p-6 text-center text-gray-500">La canopée est silencieuse ce mois-ci.</div>;

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
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
          <h3 className="text-lg font-semibold text-amber-300 mb-3 flex items-center gap-2">👑 Grand Marchand</h3>
          {stats.topSellers.length > 0 ? (
            <ul>
              {stats.topSellers.map((seller: any, idx: number) => (
                <li key={seller._id} className="flex justify-between py-1 text-sm border-b border-slate-700/30 last:border-0">
                  <span>#{idx + 1} Oiseau ({seller._id.slice(0, 6)}...)</span>
                  <span className="font-mono text-emerald-400">{(seller.totalVolumeCents / 100).toFixed(2)} €</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">Aucun échange enregistré.</p>
          )}
        </div>

        {/* Oiseau Écho */}
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
          <h3 className="text-lg font-semibold text-sky-300 mb-3 flex items-center gap-2">💬 L'Oiseau Écho</h3>
          {stats.mostCommented.length > 0 ? (
            <ul>
              {stats.mostCommented.map((echo: any, idx: number) => (
                <li key={echo._id} className="flex justify-between py-1 text-sm border-b border-slate-700/30 last:border-0">
                  <span>#{idx + 1} Oiseau ({echo._id.slice(0, 6)}...)</span>
                  <span className="font-mono text-sky-400">{echo.commentCount} commentaires</span>
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