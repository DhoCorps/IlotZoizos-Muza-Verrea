'use client';

import React, { useState, useEffect } from 'react';

interface Subsidy {
  _id: string;
  title: string;
  motivation: string;
  requestedAmount: number;
  currency: 'TOX' | 'DHO';
  voteCount: number;
  status: string;
  isRented: boolean;
}

export const CanopySubsidySection: React.FC = () => {
  const [subsidies, setSubsidies] = useState<Subsidy[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [motivation, setMotivation] = useState('');
  const [requestedAmount, setRequestedAmount] = useState(100);
  const [currency, setCurrency] = useState<'TOX' | 'DHO'>('TOX');
  const [isRented, setIsRented] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchSubsidies = async () => {
    try {
      const res = await fetch('/api/canopy/subsidy');
      const data = await res.json();
      if (data.success) {
        setSubsidies(data.subsidies);
      }
    } catch (err) {
      console.error("Erreur chargement subventions", err);
    }
  };

  useEffect(() => {
    fetchSubsidies();
  }, []);

  const handleCreateSubsidy = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/canopy/subsidy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, motivation, requestedAmount, currency, isRented })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Erreur lors du dépôt.');

      setSuccessMsg('Dossier de subvention enregistré dans la canopée ! 🦅');
      setTitle('');
      setMotivation('');
      fetchSubsidies();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (subsidyId: string) => {
    try {
      const res = await fetch('/api/canopy/subsidy/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subsidyId })
      });
      const data = await res.json();
      if (data.success) {
        fetchSubsidies();
      }
    } catch (err) {
      console.error("Erreur de vote", err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto mt-16 space-y-8">
      <div className="border-t border-slate-800 pt-10">
        <h2 className="text-2xl font-bold flex items-center gap-3 mb-2">
          <span>🗳️</span> Le Guichet des Subventions de la Canopée
        </h2>
        <p className="text-slate-400 text-sm">
          Plébiscitez les projets de la communauté ou déposez votre propre dossier pour le tirage au sort mensuel.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulaire de dépôt */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-lg font-bold mb-4 text-amber-400">Déposer un dossier</h3>
          <form onSubmit={handleCreateSubsidy} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Titre du Projet</label>
              <input 
                type="text" 
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Motivation / Description</label>
              <textarea 
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white h-24"
                value={motivation}
                onChange={e => setMotivation(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Montant</label>
                <input 
                  type="number" 
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white"
                  value={requestedAmount}
                  onChange={e => setRequestedAmount(Number(e.target.value))}
                  min={1}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Devise</label>
                <select 
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white"
                  value={currency}
                  onChange={e => setCurrency(e.target.value as any)}
                >
                  <option value="TOX">TôX</option>
                  <option value="DHO">DhÔ</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input 
                type="checkbox" 
                id="isRented"
                checked={isRented}
                onChange={e => setIsRented(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-indigo-600"
              />
              <label htmlFor="isRented" className="text-xs text-slate-300 cursor-pointer">
                Option Rente Échelonnée (si éligible)
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded transition-all shadow-lg mt-2 disabled:opacity-50"
            >
              {loading ? "Scellement..." : "Soumettre au Guichet 🦅"}
            </button>

            {error && <p className="text-red-400 text-xs mt-2">⚠️ {error}</p>}
            {successMsg && <p className="text-emerald-400 text-xs mt-2">✨ {successMsg}</p>}
          </form>
        </div>

        {/* Liste des dossiers en cours de plébiscite */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-slate-200">Dossiers en lice ({subsidies.length})</h3>
          {subsidies.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-8 text-center text-slate-500 text-sm">
              Aucun dossier déposé pour l'instant. Soyez le premier oiseau à soumettre une initiative !
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {subsidies.map(sub => (
                <div key={sub._id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-white text-base">{sub.title}</h4>
                      <span className="text-xs font-mono px-2 py-0.5 bg-indigo-950 border border-indigo-800 text-indigo-300 rounded">
                        {sub.requestedAmount} {sub.currency}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">{sub.motivation}</p>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-slate-800 text-xs">
                    <span className="text-amber-400 font-medium">🔥 Plébiscite : {sub.voteCount} votes</span>
                    <button
                      onClick={() => handleVote(sub._id)}
                      className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded transition-all border border-slate-700"
                    >
                      Voter pour ce projet 🗳️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};