// apps/hub-central/components/tasks/TaskIrrigationPanel.tsx
'use client';

import React, { useState } from 'react';

export default function TaskIrrigationPanel({ taskSlug }: { taskSlug: string }) {
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleIrrigate = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tasks/${taskSlug}/irrigate`, {
        method: 'POST'
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec de l'irrigation");
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
          <span>🌱</span> Loi de l'Irrigation (Flux de Sève)
        </h3>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        Vérifie la santé des dépendances de cette tâche. Si l'irrigation chute à 0, le flux est rompu dans la matrice.
      </p>

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-800 text-red-300 text-xs rounded">
          {error}
        </div>
      )}

      <button 
        onClick={handleIrrigate}
        disabled={loading}
        className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition shadow-lg"
      >
        {loading ? "Vérification du flux de sève..." : "Évaluer l'Irrigation de la Tâche"}
      </button>

      {result && (
        <div className={`mt-4 p-4 rounded-lg border text-sm font-mono ${result.status === 'ROMPU' ? 'bg-red-950/40 border-red-900 text-red-200' : 'bg-emerald-950/40 border-emerald-900 text-emerald-200'}`}>
          <p className="font-semibold mb-1">
            {result.status === 'ROMPU' ? '💀 Flux Rompu' : '🌱 Irrigation Active'}
          </p>
          <p className="text-xs">Titre : {result.title}</p>
          <p className="text-xs">Indice d'irrigation (It) : {result.isIrrigated}</p>
        </div>
      )}
    </div>
  );
}