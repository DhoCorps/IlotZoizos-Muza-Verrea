// apps/hub-central/components/sovereign/SovereignPurgePanel.tsx
'use client';

import React, { useState } from 'react';

export default function SovereignPurgePanel({ currentEntityUid }: { currentEntityUid: string }) {
  const [reason, setReason] = useState<'VOLUNTARY_EXILE' | 'VITAL_COLLAPSE'>('VOLUNTARY_EXILE');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePurge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm("Es-tu sûr de vouloir dissoudre cette entité et effacer toutes ses traces de la matrice ?")) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/sovereign/purge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityId: currentEntityUid,
          reason
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec de la dissolution");
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 rounded-xl bg-slate-950 border border-red-950 text-slate-100 shadow-2xl max-w-xl mx-auto space-y-6">
      <div className="border-b border-red-950/60 pb-3">
        <h3 className="text-lg font-semibold tracking-wide flex items-center gap-2 text-red-400">
          <span>🌀</span> Le Terminus & L'Évanescence (Purge Souveraine)
        </h3>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        Cette procédure supprime définitivement l'ensemble des données de l'entité dans la Silice (MongoDB) et détruit le nœud ainsi que ses liens dans le Graphe (Neo4j).
      </p>

      <form onSubmit={handlePurge} className="space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">
            Motif de la Dissolution
          </label>
          <select 
            value={reason} 
            onChange={(e) => setReason(e.target.value as any)}
            className="w-full px-3 py-2 bg-slate-900 rounded border border-slate-800 text-sm focus:outline-none focus:border-red-600 text-slate-200"
          >
            <option value="VOLUNTARY_EXILE">Exil Volontaire (Départ de l'Oiseau)</option>
            <option value="VITAL_COLLAPSE">Effondrement Vital (Déficit critique de Sève)</option>
          </select>
        </div>

        {error && (
          <div className="p-3 bg-red-950/40 border border-red-900 text-red-300 text-xs rounded">
            {error}
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-2.5 px-4 bg-red-900/80 hover:bg-red-900 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition shadow-lg border border-red-700/50"
        >
          {loading ? "Dissolution en cours dans la matrice..." : "Déclencher l'Évanescence Totale"}
        </button>
      </form>

      {result && (
        <div className="mt-6 p-4 rounded-lg bg-red-950/30 border border-red-900 text-red-200 text-sm font-mono space-y-2">
          <p className="font-semibold text-red-400">💨 Dissolution Exécutée</p>
          <p className="text-xs">{result.message}</p>
          <div className="text-[10px] text-slate-400">
            Cible : {result.result?.payload?.targetUid} | Horodatage : {result.result?.payload?.timestamp}
          </div>
        </div>
      )}
    </div>
  );
}