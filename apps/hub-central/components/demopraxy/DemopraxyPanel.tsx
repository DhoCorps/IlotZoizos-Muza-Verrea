// apps/hub-central/components/demopraxy/DemopraxyPanel.tsx
'use client';

import React, { useState } from 'react';

export default function DemopraxyPanel({ targetUserSlug }: { targetUserSlug: string }) {
  const [hatred, setHatred] = useState<number>(2);
  const [recurrence, setRecurrence] = useState<number>(1);
  const [recalibration, setRecalibration] = useState<number>(5);
  const [resonance, setResonance] = useState<number>(5);
  
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Calcul instantané en front pour le retour visuel
  const computedEx = ((hatred * recurrence) / Math.max(0.1, recalibration)).toFixed(2);
  const isCritical = Number(computedEx) >= 15.0;

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/demopraxy/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIdentifier: targetUserSlug,
          metrics: {
            systemicHatredScore: Number(hatred),
            recurrenceCount: Number(recurrence),
            recalibrationCapacity: Number(recalibration),
            collectiveResonance: Number(resonance)
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec de l'invocation du vortex");
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
          <span>🌀</span> Le Vortex Démopraxique (Stase d'Exclusion)
        </h3>
        <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold ${isCritical ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'}`}>
          Ex = {computedEx}
        </span>
      </div>

      <form onSubmit={handleEvaluate} className="space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">
            Indice de Toxicité / Haine Systémique (0 - 10): {hatred}
          </label>
          <input 
            type="range" min="0" max="10" value={hatred} 
            onChange={(e) => setHatred(Number(e.target.value))}
            className="w-full accent-indigo-500 bg-slate-800 cursor-pointer"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">
            Récurrence documentée : {recurrence}
          </label>
          <input 
            type="number" min="1" max="20" value={recurrence} 
            onChange={(e) => setRecurrence(Number(e.target.value))}
            className="w-full px-3 py-2 bg-slate-800 rounded border border-slate-700 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">
            Capacité de Recalibrage (1 - 10): {recalibration}
          </label>
          <input 
            type="range" min="0.1" max="10" step="0.5" value={recalibration} 
            onChange={(e) => setRecalibration(Number(e.target.value))}
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
          {loading ? "Invocation du vortex en cours..." : "Invoquer le Vortex Démopraxique"}
        </button>
      </form>

      {result && (
        <div className={`mt-6 p-4 rounded-lg border text-sm ${result.isExcluded ? 'bg-red-950/40 border-red-900 text-red-200' : 'bg-slate-800/60 border-slate-700 text-slate-300'}`}>
          <p className="font-semibold mb-1">{result.isExcluded ? '🌑 Sanctuaire Isolé' : '🌱 Volière en Paix'}</p>
          <p className="text-xs font-mono">{result.actionMessage}</p>
        </div>
      )}
    </div>
  );
}