'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface GameHubSelectorProps {
  username: string;
  locale: string;
}

interface GameDefinition {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  route: string;
  gradient: string;
  borderColor: string;
  icon: string;
  supportsWager: boolean;
}

const GAMES_CATALOG: GameDefinition[] = [
  {
    id: 'kooontreez',
    title: 'KoOonTreeZ',
    subtitle: 'Exploration géographique & Drapeaux',
    description: 'Reconnaissance des drapeaux du monde en temps réel et duels topographiques.',
    route: 'kooontreez',
    gradient: 'from-emerald-400 to-cyan-400',
    borderColor: 'border-emerald-500/30 hover:border-emerald-500',
    icon: '🌍',
    supportsWager: true,
  },
  {
    id: 'galaktk',
    title: 'Galak-T-K',
    subtitle: 'Grille Stellaire & Séquestre',
    description: 'Déminage spatial et cosmique par déduction d’axes stellaires.',
    route: 'galak-t-k',
    gradient: 'from-purple-400 to-cyan-400',
    borderColor: 'border-purple-500/30 hover:border-purple-500',
    icon: '✨',
    supportsWager: true,
  },
  {
    id: 'plumzee',
    title: "Plum'Zee",
    subtitle: 'Boulier des Dés Cosmiques',
    description: 'Le Yahtzee mystique de l’îlot pour aligner combinaisons et plumes magiques.',
    route: 'plumzee',
    gradient: 'from-amber-400 to-emerald-400',
    borderColor: 'border-amber-500/30 hover:border-amber-500',
    icon: '🎲',
    supportsWager: true,
  },
  {
    id: 'soonart',
    title: "Soon'Art",
    subtitle: 'Radar Artistique & Triangulation',
    description: 'Dénichez les trésors cachés par cercles de densité et déduction pure.',
    route: 'soonart',
    gradient: 'from-amber-400 to-rose-400',
    borderColor: 'border-amber-500/30 hover:border-rose-500',
    icon: '🎨',
    supportsWager: true,
  },
  {
    id: 'wikioracle',
    title: 'WikiOracle',
    subtitle: 'Sanctuaire du Savoir Wikipédia',
    description: 'Enquêtez à travers les indices textuels et temporels de l’Oracle.',
    route: 'wikioracle',
    gradient: 'from-cyan-400 to-blue-500',
    borderColor: 'border-cyan-500/30 hover:border-cyan-500',
    icon: '📖',
    supportsWager: true,
  },
  {
    id: 'cinemax',
    title: 'Ciné-Quizz-Ciné-Max',
    subtitle: 'Arène Cinématographique',
    description: 'Le projecteur s’allume. Enquêtez, coopérez et buzzez en direct !',
    route: 'cinemax',
    gradient: 'from-emerald-400 to-cyan-400',
    borderColor: 'border-emerald-500/30 hover:border-emerald-500',
    icon: '🎬',
    supportsWager: true,
  },
  {
    id: 'crazymorpion',
    title: 'CrazyMorpion',
    subtitle: 'Morpion Chaotique',
    description: 'Le morpion revisité avec chaos et symboles aléatoires multidimensionnels.',
    route: 'crazymorpion',
    gradient: 'from-blue-400 to-purple-400',
    borderColor: 'border-blue-500/30 hover:border-blue-500',
    icon: '❌',
    supportsWager: true,
  },
  {
    id: 'atomikkfarde',
    title: 'Atomik-K-Fard(e)',
    subtitle: 'Wargame Tactique',
    description: 'Conquêtes territoriales et batailles de cartes au cœur de la zone de confinement.',
    route: 'atomikkfarde',
    gradient: 'from-purple-400 via-pink-500 to-red-500',
    borderColor: 'border-purple-500/30 hover:border-red-500',
    icon: '⚡',
    supportsWager: true,
  },
];

export default function GameHubSelector({ username, locale }: GameHubSelectorProps) {
  const router = useRouter();
  const [selectedGame, setSelectedGame] = useState<GameDefinition | null>(null);
  const [roomSlug, setRoomSlug] = useState('');
  const [wagerAmount, setWagerAmount] = useState<number>(0);
  const [wagerCurrency, setWagerCurrency] = useState<string>('DHO');

  const handleLaunchRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGame) return;
    const targetSlug = roomSlug.trim() || `salon-${Math.random().toString(36).substring(2, 8)}`;
    
    // Redirection vers la salle dédiée avec paramètres optionnels de séquestre
    router.push(`/${locale}/games/${selectedGame.route}/${targetSlug}?wager=${wagerAmount}&currency=${wagerCurrency}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 text-slate-100">
      {/* En-tête du Nexus */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-black font-mono tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 mb-3">
          NEXUS DES JEUX — ÎLOT ZOIZOS
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-sm">
          Salutations, <span className="text-cyan-300 font-semibold">{username}</span>. Choisissez votre dimension ludique, configurez vos séquestres et entrez dans l'arène.
        </p>
        <div className="mt-4 flex justify-center gap-4">
          <Link
            href={`/${locale}/games/leaderboard`}
            className="px-4 py-2 bg-slate-900 border border-slate-700 hover:border-cyan-500 text-xs font-mono rounded-lg transition-colors text-slate-300 hover:text-white"
          >
            🏆 Voir le Hall of Fame (Leaderboard)
          </Link>
        </div>
      </div>

      {/* Grille des Jeux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {GAMES_CATALOG.map((game) => (
          <div
            key={game.id}
            onClick={() => setSelectedGame(game)}
            className={`cursor-pointer rounded-xl bg-slate-900/60 border ${
              selectedGame?.id === game.id ? 'border-cyan-400 ring-2 ring-cyan-500/20 bg-slate-900' : game.borderColor
            } p-6 flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] backdrop-blur-sm shadow-xl`}
          >
            <div>
              <div className="text-3xl mb-3">{game.icon}</div>
              <h2 className={`text-xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r ${game.gradient} mb-1`}>
                {game.title}
              </h2>
              <p className="text-xs font-mono text-slate-400 mb-3">{game.subtitle}</p>
              <p className="text-xs text-slate-300 leading-relaxed">{game.description}</p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Arène active</span>
              <span className="text-xs font-mono text-cyan-400 group-hover:translate-x-1 transition-transform">Sélectionner →</span>
            </div>
          </div>
        ))}
      </div>

      {/* Panneau de configuration et de lancement de salon */}
      {selectedGame && (
        <div className="bg-slate-900/90 border border-cyan-500/40 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur-md max-w-3xl mx-auto animate-fadeIn">
          <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{selectedGame.icon}</span>
              <div>
                <h3 className="text-lg font-bold font-mono text-white">Configuration du Salon : {selectedGame.title}</h3>
                <p className="text-xs text-slate-400">Préparez vos paris et l'identifiant de votre arène.</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedGame(null)}
              className="text-xs font-mono text-slate-500 hover:text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg"
            >
              Fermer ✕
            </button>
          </div>

          <form onSubmit={handleLaunchRoom} className="space-y-6">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-2">Identifiant du Salon (Slug de la Room)</label>
              <input
                type="text"
                value={roomSlug}
                onChange={(e) => setRoomSlug(e.target.value)}
                placeholder="Ex: partie-epique-2026 (laisser vide pour auto-générer)"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            {selectedGame.supportsWager && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-2">Montant du Séquestre (Wager)</label>
                  <input
                    type="number"
                    min="0"
                    value={wagerAmount}
                    onChange={(e) => setWagerAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-2">Devise de Troc / Paiement</label>
                  <select
                    value={wagerCurrency}
                    onChange={(e) => setWagerCurrency(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <option value="DHO">DHO (Monnaie de l'Îlot)</option>
                    <option value="PARCHEMINS">Parchemins Sacrés</option>
                    <option value="CREDITS">Crédits Cosmiques</option>
                  </select>
                </div>
              </div>
            )}

            <div className="pt-4 flex justify-end gap-4">
              <button
                type="submit"
                className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-mono font-bold text-sm rounded-xl shadow-lg transition-all duration-300 tracking-wider"
              >
                LANCER LA PARTIE ⚡
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}