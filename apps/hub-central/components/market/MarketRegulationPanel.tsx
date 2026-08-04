// apps/hub-central/components/market/MarketRegulationPanel.tsx
'use client';

import React, { useState } from 'react';

export default function MarketRegulationPanel({ userSlug }: { userSlug: string }) {
  const [takeValue, setTakeValue] = useState<number>(5);
  const [currentNeeds, setCurrentNeeds] = useState<number>(2);
  const [creationFactor, setCreationFactor] = useState<number>(1.5);
  
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ecommerce/market/regulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIdentifier: userSlug,
          takeValue: Number(takeValue),
          currentNeeds: Number(currentNeeds),
          creationFactor: Number(creationFactor)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec de la régulation");
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 shadow-2xl max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <h3 className="text-lg font-semibold tracking-wide flex items-center gap-2">
          <span>⚖️</span> Régulation de l'Échange (Sève & Marché)
        </h3>
        {result && (
          <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold ${result.isAuthorized ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'}`}>
            Lambda = {result.vitalBalance}
          </span>
        )}
      </div>

      <form onSubmit={handleRegulate} className="space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">
            Valeur du Prélèvement (Take Value) : {takeValue}
          </label>
          <input 
            type="number" min="1" max="50" value={takeValue} 
            onChange={(e) => setTakeValue(Number(e.target.value))}
            className="w-full px-3 py-2 bg-slate-800 rounded border border-slate-700 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">
            Besoins Actuels (Current Needs) : {currentNeeds}
          </label>
          <input 
            type="number" min="1" max="20" value={currentNeeds} 
            onChange={(e) => setCurrentNeeds(Number(e.target.value))}
            className="w-full px-3 py-2 bg-slate-800 rounded border border-slate-700 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">
            Facteur de Création (Omega) : {creationFactor}
          </label>
          <input 
            type="range" min="0.1" max="5" step="0.1" value={creationFactor} 
            onChange={(e) => setCreationFactor(Number(e.target.value))}
            className="w-full accent-emerald-500 bg-slate-800 cursor-pointer"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-900/30 border border-red-800 text-red-300 text-xs rounded">
            {error}
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition shadow-lg"
        >
          {loading ? "Calcul du flux de sève..." : "Évaluer et Réguler l'Impulsion"}
        </button>
      </form>

      {result && (
        <div className={`mt-6 p-4 rounded-lg border text-sm ${result.isAuthorized ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-red-950/40 border-red-900 text-red-200'}`}>
          <p className="font-semibold mb-1 flex items-center justify-between">
            <span>{result.isAuthorized ? '🌱 Flux Autorisable' : '🌑 Échange Rejeté'}</span>
            {result.latencyMs > 0 && <span className="text-amber-400 font-mono text-xs">Latence : {result.latencyMs}ms</span>}
          </p>
          <p className="text-xs font-mono mt-1">{result.message}</p>
        </div>
      )}
    </div>
  );
}