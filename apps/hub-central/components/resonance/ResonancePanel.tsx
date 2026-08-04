// apps/hub-central/components/resonance/ResonancePanel.tsx
'use client';

import React, { useState, useEffect } from 'react';

export default function ResonancePanel({ entityUid, entityLabel }: { entityUid: string; entityLabel: string }) {
  const [resonances, setResonances] = useState<any[]>([]);
  const [echoContent, setEchoContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResonances() {
      try {
        const res = await fetch(`/api/graph/context?uid=${entityUid}`);
        const data = await res.json();
        if (Array.isArray(data)) setResonances(data);
      } catch (err) {
        console.error("Erreur de chargement des résonances", err);
      }
    }
    if (entityUid) fetchResonances();
  }, [entityUid]);

  const handleSendEcho = async (e: React.FormEvent, type: 'TEXT' | 'EMOJI') => {
    e.preventDefault();
    if (!echoContent.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/resonance/echoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUid: entityUid,
          targetLabel: entityLabel,
          echoType: type,
          content: echoContent
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec de l'envoi de l'écho");
      
      setResonances(prev => [...prev, { relation: type === 'TEXT' ? 'ECHOES' : 'VIBRATES', uid: data.echoUid, title: echoContent, type: 'User' }]);
      setEchoContent('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 shadow-2xl max-w-xl mx-auto space-y-6">
      <div className="border-b border-slate-800 pb-3">
        <h3 className="text-lg font-semibold tracking-wide flex items-center gap-2">
          <span>🕸️</span> Radar de Résonance & Échos
        </h3>
      </div>

      <div className="space-y-3">
        <h4 className="text-xs uppercase tracking-wider text-slate-400">Connexions du Maillage</h4>
        {resonances.length === 0 ? (
          <p className="text-xs text-slate-500 italic">Aucune résonance détectée pour le moment.</p>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {resonances.map((res, index) => (
              <div key={index} className="p-2.5 rounded bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs font-mono">
                <span className="text-indigo-400 font-bold">[{res.relation}]</span>
                <span className="text-slate-200 truncate max-w-[200px]">{res.title}</span>
                <span className="text-slate-500 text-[10px]">{res.type}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={(e) => handleSendEcho(e, 'TEXT')} className="space-y-3 pt-3 border-t border-slate-800">
        <label className="block text-xs uppercase tracking-wider text-slate-400">Laisser un Écho</label>
        <div className="flex gap-2">
          <input 
            type="text" value={echoContent} onChange={(e) => setEchoContent(e.target.value)}
            placeholder="Écris ton écho..." 
            className="flex-1 px-3 py-2 bg-slate-800 rounded border border-slate-700 text-sm focus:outline-none focus:border-indigo-500"
          />
          <button 
            type="submit" disabled={loading}
            className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded transition"
          >
            Écho
          </button>
        </div>
        <div className="flex gap-2 pt-1">
          {['🔥', '💡', '🌱', '🫀', '⚡'].map((emoji) => (
            <button
              key={emoji} type="button"
              onClick={() => { setEchoContent(emoji); }}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition text-sm"
            >
              {emoji}
            </button>
          ))}
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </form>
    </div>
  );
}