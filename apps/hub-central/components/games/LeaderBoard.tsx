// apps/hub-central/components/games/Leaderboard.tsx
'use client';
import React, { useState, useEffect } from 'react';

interface ScoreEntry {
  _id: string;
  username: string;
  gameType: string;
  score: number;
  maxStreak?: number;
  trophies?: string[];
  createdAt: string;
}

const GAME_ICONS: Record<string, { label: string; icon: string; color: string }> = {
  KoOonTreez: { label: 'KoÔonTreez', icon: '🌳', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  WikiOracle: { label: 'WikiOracle', icon: '🔮', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  CrazyMorpion: { label: 'Crazy Morpion', icon: '❌', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
  AtomikKFardE: { label: 'AtomiK-K-Fard(E)', icon: '⚡', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
};

export default function Leaderboard() {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/games/leaderboard?gameType=${selectedGame}&limit=15`);
        const data = await res.json();
        if (data.success) {
          setScores(data.scores);
        }
      } catch (err) {
        console.error('Erreur chargement leaderboard :', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLeaderboard();
  }, [selectedGame]);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800">
      
      {/* 🏆 En-tête */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-amber-400 to-purple-400 mb-2">
          🏛️ Le Hall of Fame de l'Îlot
        </h2>
        <p className="text-slate-400 text-sm">Les exploits légendaires des oiseaux à travers les dimensions.</p>
      </div>

      {/* 🎛️ Filtres par jeu */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        <button
          onClick={() => setSelectedGame('all')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
            selectedGame === 'all' ? 'bg-white text-slate-950 border-white shadow-lg' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
          }`}
        >
          🌌 Tous les Jeux
        </button>
        {Object.entries(GAME_ICONS).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setSelectedGame(key)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border flex items-center gap-2 ${
              selectedGame === key ? `${config.color} shadow-lg scale-105` : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <span>{config.icon}</span>
            <span>{config.label}</span>
          </button>
        ))}
      </div>

      {/* 📊 Contenu */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-400 animate-pulse">
          Interrogation des archives de l'Îlot... 📜
        </div>
      ) : scores.length === 0 ? (
        <div className="text-center py-16 text-slate-500 border border-slate-800 rounded-xl bg-slate-950/40">
          <div className="text-4xl mb-2">🍃</div>
          <p>Aucun score enregistré pour le moment dans cette dimension.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scores.map((entry, idx) => {
            const rank = idx + 1;
            const isTop1 = rank === 1;
            const isTop2 = rank === 2;
            const isTop3 = rank === 3;

            let rankBadge = 'bg-slate-800 text-slate-400 border-slate-700';
            if (isTop1) rankBadge = 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-amber-500/20 shadow-lg';
            if (isTop2) rankBadge = 'bg-slate-300/20 text-slate-200 border-slate-300/50';
            if (isTop3) rankBadge = 'bg-amber-700/20 text-amber-600 border-amber-700/50';

            const gameConfig = GAME_ICONS[entry.gameType] || { label: entry.gameType, icon: '🎮', color: 'text-slate-400' };

            return (
              <div 
                key={entry._id}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all bg-slate-800/50 hover:bg-slate-800 ${
                  isTop1 ? 'border-amber-500/40 bg-amber-500/5' : 'border-slate-800'
                }`}
              >
                {/* Rang et Nom */}
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-black text-base ${rankBadge}`}>
                    {isTop1 ? '👑' : `#${rank}`}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base flex items-center gap-2">
                      <span>{entry.username}</span>
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs px-2 py-0.5 rounded border ${gameConfig.color}`}>
                        {gameConfig.icon} {gameConfig.label}
                      </span>
                      {entry.maxStreak && entry.maxStreak > 1 && (
                        <span className="text-xs text-amber-400 font-semibold">🔥 {entry.maxStreak} streak</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Score et Trophées */}
                <div className="text-right">
                  <div className="text-2xl font-black text-emerald-400">{entry.score.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-400">pts</span></div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {new Date(entry.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}