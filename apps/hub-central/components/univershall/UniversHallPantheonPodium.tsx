// apps/hub-central/components/UniversHallPantheonPodium.tsx

'use client';

import React, { useState, useEffect } from 'react';

export interface PantheonEntry {
  uid: string;
  pseudo: string;
  avatarUrl?: string;
  resonanceScore: number;
  financialEnergy: number;
  praisesCount: number;
  matrixScore: number;
}

export default function UniversHallPantheonPodium() {
  const [leaders, setLeaders] = useState<PantheonEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState<string>('global');

  useEffect(() => {
    async function fetchPantheon() {
      try {
        const res = await fetch('/api/univershall/pantheon');
        const json = await res.json();
        if (json.success && json.pantheon) {
          setLeaders(json.pantheon);
          if (json.cycle) setCycle(json.cycle);
        }
      } catch (err) {
        console.error("Erreur lors de l'ascension vers le Panthéon :", err);
      } finally {
        setLoading(false);
      }
    }

    fetchPantheon();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-amber-400 animate-pulse font-mono">
        L'Îlot consulte les archives du Panthéon...
      </div>
    );
  }

  if (leaders.length === 0) {
    return (
      <div className="text-center py-20 text-slate-500 italic">
        Le Panthéon est silencieux. Aucun esprit n'a encore gravé sa résonance pour ce cycle.
      </div>
    );
  }

  // Extraction du Top 3 pour le Podium et du reste pour la liste d'honneur
  const topThree = leaders.slice(0, 3);
  const restOfLeaders = leaders.slice(3);

  // Réordonner pour afficher le podium dans l'ordre classique : 2ème, 1er, 3ème
  const podiumOrder = [topThree[1], topThree[0], topThree[2]].filter(Boolean);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 text-slate-100">
      <header className="text-center mb-12">
        <h2 className="text-3xl font-extrabold text-amber-400 tracking-wider mb-2">LE PANTHÉON DES RÉSONANCES</h2>
        <p className="text-slate-400 text-sm">Cycle : <span className="text-amber-300 font-mono">{cycle}</span></p>
      </header>

      {/* LE PODIUM DE L'ÉLITE (Top 3) */}
      <div className="flex justify-center items-end gap-4 mb-16 pt-8">
        {podiumOrder.map((leader) => {
          if (!leader) return null;
          const isFirst = leader === topThree[0];
          const isSecond = leader === topThree[1];
          
          return (
            <div
              key={leader.uid}
              className={`flex flex-col items-center transition-transform hover:scale-105 duration-300 ${
                isFirst ? 'w-1/3 -translate-y-6 z-10' : 'w-1/4'
              }`}
            >
              {/* Couronne ou Icône du Rang */}
              <div className="text-2xl mb-2">
                {isFirst ? '👑' : isSecond ? '🥈' : '🥉'}
              </div>

              {/* Avatar ou Empreinte */}
              <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center font-bold text-lg mb-3 shadow-lg ${
                isFirst ? 'border-amber-400 bg-amber-500/20 text-amber-300' : 'border-slate-700 bg-slate-800 text-slate-300'
              }`}>
                {leader.avatarUrl ? (
                  <img src={leader.avatarUrl} alt={leader.pseudo} className="w-full h-full rounded-full object-cover" />
                ) : (
                  leader.pseudo.charAt(0).toUpperCase()
                )}
              </div>

              <h3 className="font-bold text-slate-200 text-center truncate max-w-[120px]">{leader.pseudo}</h3>
              <p className="text-amber-400 font-extrabold text-lg mt-1">{leader.resonanceScore}</p>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest">Résonance</span>

              {/* Pilier du Podium */}
              <div className={`w-full rounded-t-xl mt-4 border-t-2 flex items-center justify-center ${
                isFirst
                  ? 'h-40 bg-gradient-to-t from-amber-950/40 to-amber-500/20 border-amber-400'
                  : isSecond
                  ? 'h-28 bg-gradient-to-t from-slate-900 to-slate-800/50 border-slate-600'
                  : 'h-20 bg-gradient-to-t from-slate-900 to-slate-800/30 border-slate-700'
              }`}>
                <span className="text-2xl font-black text-slate-400/40">
                  {isFirst ? '1' : isSecond ? '2' : '3'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* LA SUITE DU PANTHÉON (Rang 4 à 10) */}
      {restOfLeaders.length > 0 && (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Les Veilleurs de la Canopée</h3>
          <div className="space-y-3">
            {restOfLeaders.map((leader, index) => (
              <div key={leader.uid} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-500 w-6 text-center">#{index + 4}</span>
                  <span className="font-semibold text-slate-200">{leader.pseudo}</span>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-xs text-slate-400 hidden sm:inline">Éloges : {leader.praisesCount}</span>
                  <span className="font-bold text-amber-400">{leader.resonanceScore}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}