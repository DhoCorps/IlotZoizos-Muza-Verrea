// apps/hub-central/components/tasks/TaskResonancePanel.tsx
'use client';

import React, { useState } from 'react';

export default function TaskResonancePanel({ userSlug }: { userSlug: string }) {
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleComputeResonance = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/users/${userSlug}/resonance`, {
        method: 'POST'
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec du calcul de résonance");
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 shadow-2xl max-w-xl mx-auto space-y-4">
      <div className="border-b border-slate-800 pb-3">
        <h3 className="text-lg font-semibold tracking-wide flex items-center gap-2">
          <span>🎶</span> Résonance des Tâches Accomplies (Rz)
        </h3>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        Analyse l'efficacité et la complexité des atomes complétés par cet oiseau pour mettre à jour sa résonance vibratoire globale.
      </p>

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-800 text-red-300 text-xs rounded">
          {error}
        </div>
      )}

      <button 
        onClick={handleComputeResonance}
        disabled={loading}
        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition shadow-lg"
      >
        {loading ? "Calcul de la résonance vibratoire..." : "Calculer la Résonance Globale (Rz)"}
      </button>

      {result && (
        <div className="mt-4 p-4 rounded-lg bg-indigo-950/40 border border-indigo-900 text-indigo-200 text-sm font-mono space-y-1">
          <p className="font-semibold text-indigo-400">✨ Harmonisation Réussie</p>
          <p className="text-xs">Tâches complétées analysées : {result.completedTasksCount}</p>
          <p className="text-xs font-bold">Résonance Totale (Rz) : {result.totalResonance}</p>
        </div>
      )}
    </div>
  );
}