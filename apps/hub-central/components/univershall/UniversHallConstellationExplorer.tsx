// apps/hub-central/components/UniversHallConstellationExplorer.tsx

'use client';

import React, { useState } from 'react';

export default function UniversHallConstellationExplorer() {
  const [searchTag, setSearchTag] = useState('');
  const [constellationData, setConstellationData] = useState<Record<string, any[]> | null>(null);
  const [totalMatches, setTotalMatches] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTag.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/univershall/constellation?tag=${encodeURIComponent(searchTag.trim())}`);
      const json = await res.json();

      if (json.success) {
        setConstellationData(json.constellation);
        setTotalMatches(json.totalMatches);
      } else {
        setError(json.error || "La constellation est restée muette.");
      }
    } catch (err) {
      console.error("Erreur lors de l'exploration de la constellation :", err);
      setError("Une interférence est survenue dans le réseau sémantique.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 text-slate-100">
      <header className="text-center mb-10">
        <h2 className="text-3xl font-extrabold text-amber-400 tracking-wider mb-2">CONSTELLATION DES TAGS CROISÉS</h2>
        <p className="text-slate-400 text-sm">Explore le tissu sémantique de l'Îlot à travers les résonances d'un même mot-clé.</p>
      </header>

      {/* Barre de recherche sémantique */}
      <form onSubmit={handleSearch} className="flex gap-3 max-w-xl mx-auto mb-12">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">#</span>
          <input
            type="text"
            value={searchTag}
            onChange={(e) => setSearchTag(e.target.value)}
            placeholder="Entre un tag (ex: poesie, ciel, philosophie)..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-4 py-3 text-slate-100 focus:outline-none focus:border-amber-500 transition-all placeholder:text-slate-600"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-amber-500 text-slate-950 font-bold px-6 py-3 rounded-xl hover:bg-amber-400 transition-all disabled:opacity-50 shadow-lg shadow-amber-500/10"
        >
          {loading ? 'Traversée...' : 'Tisser'}
        </button>
      </form>

      {error && (
        <div className="max-w-xl mx-auto mb-8 p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 text-center text-sm">
          {error}
        </div>
      )}

      {/* Résultats de la Constellation */}
      {constellationData && (
        <div className="space-y-8 animate-fadeIn">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <h3 className="text-lg font-bold text-slate-300">
              Résultats pour <span className="text-amber-400">#{searchTag}</span>
            </h3>
            <span className="text-xs bg-slate-900 border border-slate-800 text-slate-400 px-3 py-1 rounded-full font-mono">
              {totalMatches} écho{totalMatches > 1 ? 's' : ''} trouvé{totalMatches > 1 ? 's' : ''}
            </span>
          </div>

          {Object.keys(constellationData).length === 0 ? (
            <div className="text-center py-16 text-slate-500 italic bg-slate-900/30 rounded-2xl border border-slate-800/50">
              Aucun astre ne résonne avec ce tag dans les registres de l'Îlot.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {Object.entries(constellationData).map(([moduleName, beacons]: [string, any[]]) => (
                <div key={moduleName} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-extrabold text-amber-400 uppercase tracking-wider text-xs flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                      Module : {moduleName}
                    </h4>
                    <span className="text-xs font-mono text-slate-500">{beacons.length} élément{beacons.length > 1 ? 's' : ''}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {beacons.map((beacon: any) => (
                      <div
                        key={beacon.uid}
                        className="bg-slate-900 border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between hover:border-amber-500/40 transition-all shadow-md group"
                      >
                        <div>
                          <h5 className="font-bold text-slate-200 group-hover:text-amber-300 transition-colors mb-1">
                            {beacon.title}
                          </h5>
                          {beacon.summary && (
                            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                              {beacon.summary}
                            </p>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-800/60 flex justify-between items-center">
                          <span className="text-[10px] text-slate-500 font-mono">Score : {beacon.resonanceScore || 0}</span>
                          <span className="text-xs text-amber-400/80 group-hover:translate-x-1 transition-transform">
                            Voir →
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}