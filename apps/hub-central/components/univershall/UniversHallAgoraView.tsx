// apps/hub-central/components/UniversHallAgoraView.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { AlchemyEngine } from '@ilot/shared-core';

export default function UniversHallAgoraView() {
  const [activeTab, setActiveTab] = useState<'stream' | 'constellation' | 'pantheon'>('stream');
  const [streamItems, setStreamItems] = useState<any[]>([]);
  const [pantheonLeaders, setPantheonLeaders] = useState<any[]>([]);
  const [searchTag, setSearchTag] = useState('');
  const [constellationResults, setConstellationResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 1. Chargement du Flux Transversal et application de l'Alchimie Multimédia
  useEffect(() => {
    async function fetchStream() {
      try {
        const res = await fetch('/api/univershall/stream');
        const json = await res.json();
        if (json.success && json.data) {
          // Infusion automatique des ambiances sonores (Alchimie Multimédia)
          const infusedStream = AlchemyEngine.infuseAmbientAudio(json.data);
          setStreamItems(infusedStream);
        }
      } catch (err) {
        console.error("Erreur lors de la lecture du flux transversal :", err);
      }
    }

    async function fetchPantheon() {
      try {
        const res = await fetch('/api/univershall/pantheon');
        const json = await res.json();
        if (json.success && json.pantheon) {
          setPantheonLeaders(json.pantheon);
        }
      } catch (err) {
        console.error("Erreur lors de la lecture du Panthéon :", err);
      }
    }

    fetchStream();
    fetchPantheon();
  }, []);

  // 2. Recherche par Constellation de Tags
  const handleConstellationSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTag.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/univershall/constellation?tag=${encodeURIComponent(searchTag)}`);
      const json = await res.json();
      if (json.success) {
        setConstellationResults(json.constellation);
      }
    } catch (err) {
      console.error("Erreur de recherche dans la constellation :", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 text-slate-100 bg-slate-950 min-h-screen">
      {/* En-tête d'Univers'Hall */}
      <header className="text-center mb-10">
        <h1 className="text-4xl font-extrabold tracking-wider text-amber-400 mb-2">UNIVERS'HALL</h1>
        <p className="text-slate-400 italic">L'Agora centrale de l'Îlot Zoizos : là où les chants, les écrits et les notes convergent.</p>
      </header>

      {/* Navigation des Quartiers d'Agrégation */}
      <nav className="flex justify-center gap-4 mb-8 border-b border-slate-800 pb-4">
        <button
          onClick={() => setActiveTab('stream')}
          className={`px-6 py-2 rounded-lg font-semibold transition-all ${
            activeTab === 'stream' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          📜 Flux Transversal
        </button>
        <button
          onClick={() => setActiveTab('constellation')}
          className={`px-6 py-2 rounded-lg font-semibold transition-all ${
            activeTab === 'constellation' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          ✨ Constellation des Tags
        </button>
        <button
          onClick={() => setActiveTab('pantheon')}
          className={`px-6 py-2 rounded-lg font-semibold transition-all ${
            activeTab === 'pantheon' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          🏛️ Panthéon des Résonances
        </button>
      </nav>

      {/* CONTENU : 1. LE FLUX TRANSVERSAL (AVEC ALCHIMIE MULTIMÉDIA) */}
      {activeTab === 'stream' && (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {streamItems.length === 0 ? (
            <p className="col-span-full text-center text-slate-500">Le vent est calme... Aucune création sur l'Agora pour l'instant.</p>
          ) : (
            streamItems.map((item) => (
              <div key={item.mediaId} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-md hover:border-amber-500/50 transition-all">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400">
                      {item.sourceApp}
                    </span>
                    <span className="text-xs text-slate-500">@{item.ownerSlug}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-100 mb-2">{item.title}</h3>
                  
                  {/* Affichage de l'Ambiance Sonore Alchimique (si injectée) */}
                  {item.metadata?.ambientTrackInfo && (
                    <div className="mt-3 p-3 bg-slate-950/70 border border-amber-500/20 rounded-lg flex items-center gap-3">
                      <span className="text-amber-400 animate-pulse">🎵</span>
                      <div className="text-xs">
                        <p className="text-slate-300 font-medium">Ambiance : {item.metadata.ambientTrackInfo.title}</p>
                        <p className="text-slate-500">par @{item.metadata.ambientTrackInfo.author}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/60 flex justify-between items-center">
                  <span className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleDateString()}</span>
                  <a
                    href={item.mediaUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-amber-400 hover:text-amber-300"
                  >
                    Explorer →
                  </a>
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {/* CONTENU : 2. CONSTELLATION DES TAGS CROISÉS */}
      {activeTab === 'constellation' && (
        <section>
          <form onSubmit={handleConstellationSearch} className="flex gap-3 max-w-xl mx-auto mb-10">
            <input
              type="text"
              value={searchTag}
              onChange={(e) => setSearchTag(e.target.value)}
              placeholder="Entrer un tag (ex: poesie, ciel, philosophie)..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-amber-500 text-slate-950 font-bold px-6 py-3 rounded-xl hover:bg-amber-400 transition-all disabled:opacity-50"
            >
              {loading ? 'Recherche...' : 'Explorer'}
            </button>
          </form>

          {constellationResults && (
            <div className="space-y-8">
              {Object.keys(constellationResults).length === 0 ? (
                ('Aucun écho trouvé pour ce tag dans la constellation.')
              ) : (
                Object.entries(constellationResults).map(([moduleName, beacons]: [string, any]) => (
                  <div key={moduleName} className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
                      <span>⚡ Module : {moduleName}</span>
                      <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">({beacons.length})</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {beacons.map((b: any) => (
                        <div key={b.uid} className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                          <h4 className="font-semibold text-slate-200">{b.title}</h4>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{b.summary}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      )}

      {/* CONTENU : 3. PANTHÉON DES RÉSONANCES */}
      {activeTab === 'pantheon' && (
        <section className="max-w-3xl mx-auto space-y-4">
          <h2 className="text-2xl font-bold text-amber-400 text-center mb-6">🏆 L'Élite de la Canopée</h2>
          {pantheonLeaders.length === 0 ? (
            <p className="text-center text-slate-500">Le Panthéon s'éveille... Aucun esprit classé pour le moment.</p>
          ) : (
            pantheonLeaders.map((leader, index) => (
              <div
                key={leader.uid}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  index === 0
                    ? 'bg-amber-500/10 border-amber-500/40 shadow-amber-500/10 shadow-lg'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-100">{leader.pseudo}</h3>
                    <p className="text-xs text-slate-500">Éloges reçus : {leader.praisesCount} | Énergie : {leader.financialEnergy}€</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-extrabold text-amber-400">{leader.resonanceScore}</span>
                  <p className="text-[10px] uppercase text-slate-500 tracking-wider">Score de Résonance</p>
                </div>
              </div>
            ))
          )}
        </section>
      )}
    </div>
  );
}