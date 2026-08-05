'use client';

import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { PlumZeeRoomToSend } from '@ilot/shared-core';

interface PlumZeeClientProps {
  socket: Socket;
  roomId: string;
  username: string;
}

const SYMBOL_MAP: Record<number, { name: string; icon: string; color: string }> = {
  1: { name: 'Plume', icon: '🪶', color: '#38BDF8' },
  2: { name: 'Sève', icon: '💧', color: '#10B981' },
  3: { name: 'Graine', icon: '🌰', color: '#D97706' },
  4: { name: 'Astre', icon: '⭐', color: '#F59E0B' },
  5: { name: 'Étincelle', icon: '⚡', color: '#EF4444' },
  6: { name: 'Oiseau', icon: '<(:<', color: '#8B5CF6' }
};

const COMBINATIONS: { key: string; label: string; desc: string }[] = [
  { key: 'FEATHER', label: '🪶 Somme des Plumes', desc: 'Total des dés Plume (1)' },
  { key: 'SAP', label: '💧 Somme des Sèves', desc: 'Total des dés Sève (2)' },
  { key: 'SEED', label: '🌰 Somme des Graines', desc: 'Total des dés Graine (3)' },
  { key: 'STAR', label: '⭐ Somme des Astres', desc: 'Total des dés Astre (4)' },
  { key: 'SPARK', label: '⚡ Somme des Étincelles', desc: 'Total des dés Étincelle (5)' },
  { key: 'BIRD', label: '<(:< Somme des Oiseaux', desc: 'Total des dés Oiseau (6)' },
  { key: 'BRELAN', label: '🎯 Brelan', desc: '3 symboles identiques (Somme totale)' },
  { key: 'CARRE', label: '🔥 Carré', desc: '4 symboles identiques (Somme totale)' },
  { key: 'NID_DOUILLET', label: '🪹 Nid Douillet (Full)', desc: '3 identiques + 2 identiques (25 pts)' },
  { key: 'PETITE_MIGRATION', label: '✈️ Petite Migration', desc: '4 symboles consécutifs (30 pts)' },
  { key: 'GRANDE_MIGRATION', label: '🌌 Grande Migration', desc: '5 symboles consécutifs (40 pts)' },
  { key: 'PLUMZEE', label: '🌟 Plum’Zee', desc: '5 symboles identiques (50 pts)' },
  { key: 'VENT_LIBRE', label: '🌬️ Vent Libre (Chance)', desc: 'Somme de tous les dés' }
];

export default function PlumZeeClient({ socket, roomId, username }: PlumZeeClientProps) {
  const [gameState, setGameState] = useState<PlumZeeRoomToSend | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Apparence : 'sober' ou '3d'
  const [interfaceStyle, setInterfaceStyle] = useState<'sober' | '3d'>('3d');
  // Animation du crayon magique (stocke la clé en cours d'écriture)
  const [animatingCombination, setAnimatingCombination] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    if (socket.connected) {
      socket.emit('room:join', { roomId, username });
    }

    const handleConnect = () => {
      socket.emit('room:join', { roomId, username });
    };

    const handleStateUpdate = (data: PlumZeeRoomToSend) => {
      if (data.gameType === 'PlumZee') {
        setGameState(data);
        setErrorMsg(null);
      }
    };

    socket.on('connect', handleConnect);
    socket.on('room:joined', handleStateUpdate);
    socket.on('game:state-update', handleStateUpdate);
    socket.on('error:message', (msg: string) => setErrorMsg(msg));

    return () => {
      socket.emit('room:leave', { roomId });
      socket.off('connect', handleConnect);
      socket.off('room:joined', handleStateUpdate);
      socket.off('game:state-update', handleStateUpdate);
      socket.off('error:message');
    };
  }, [socket, roomId, username]);

  const handleRollDice = () => {
    if (!socket || gameState?.state !== 'playing') return;
    socket.emit('game:make-move', {
      roomId,
      playerId: socket.id,
      gameType: 'PlumZee',
      action: 'ROLL_DICE',
      payload: {}
    });
  };

  const handleToggleLock = (dieIndex: number) => {
    if (!socket || gameState?.state !== 'playing') return;
    socket.emit('game:make-move', {
      roomId,
      playerId: socket.id,
      gameType: 'PlumZee',
      action: 'TOGGLE_LOCK',
      payload: { dieIndex }
    });
  };

  const handleScoreCombination = (combinationKey: string) => {
    if (!socket || gameState?.state !== 'playing') return;
    
    setAnimatingCombination(combinationKey);
    setTimeout(() => {
      setAnimatingCombination(null);
      socket.emit('game:make-move', {
        roomId,
        playerId: socket.id,
        gameType: 'PlumZee',
        action: 'SCORE_COMBINATION',
        payload: { combinationKey }
      });
    }, 600);
  };

  if (!gameState) return <div className="text-center text-slate-400 py-12 font-mono">Ouverture du parchemin Plum’Zee...</div>;

  const me = gameState.players.find(p => p.id === socket?.id);
  const isMyTurn = gameState.currentTurnPlayerId === socket?.id;

  return (
    <div className="max-w-7xl mx-auto p-4 flex flex-col xl:flex-row gap-6 w-full">
      
      {/* SECTION CENTRALE : DÉS & PLATEAU */}
      <div className="flex-[2] bg-slate-900 rounded-2xl p-6 border border-amber-500/20 shadow-xl flex flex-col items-center">
        
        {/* EN-TÊTE & SÉLECTEUR DE STYLE */}
        <div className="w-full flex flex-col md:flex-row justify-between items-center mb-6 pb-4 border-b border-amber-500/20 gap-4">
          <div>
            <h2 className="text-2xl font-black text-white">{gameState.name}</h2>
            <p className="text-xs font-mono text-amber-400 mt-1">
              Manche {gameState.round} / 13 | Tour de : <span className="font-bold text-white">{gameState.players.find(p => p.id === gameState.currentTurnPlayerId)?.username || '...'}</span>
              {isMyTurn && <span className="ml-2 px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/40 text-[10px]">C'est à vous !</span>}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-400">Interface :</span>
            <div className="bg-black/50 p-1 rounded-xl border border-amber-500/20 flex gap-1">
              <button 
                onClick={() => setInterfaceStyle('sober')}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${interfaceStyle === 'sober' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Sobre
              </button>
              <button 
                onClick={() => setInterfaceStyle('3d')}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${interfaceStyle === '3d' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                3D Immersif
              </button>
            </div>
          </div>
        </div>

        {errorMsg && <div className="w-full mb-4 p-3 bg-red-500/20 text-red-400 rounded-lg text-center text-sm font-mono">{errorMsg}</div>}

        {gameState.state === 'gameOver' && (
          <div className="w-full mb-6 p-5 bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border border-emerald-500/30 rounded-xl text-center">
            <h3 className="text-2xl font-bold text-white mb-1">🏆 Fin de la Partie Plum’Zee !</h3>
            <p className="text-sm text-slate-200">Vainqueur suprême : <span className="font-bold text-amber-400">{gameState.players.find(p => p.id === gameState.winnerId)?.username || 'Personne'}</span></p>
          </div>
        )}

        {/* ZONE DES DÉS COSMIQUES */}
        <div className="w-full bg-black/50 border border-amber-500/20 rounded-2xl p-8 flex flex-col items-center justify-center gap-6 shadow-inner my-2">
          
          <div className="flex flex-wrap justify-center gap-4 md:gap-6">
            {gameState.currentDice.map((die, index) => {
              const meta = SYMBOL_MAP[die.value] || { icon: '?', color: '#fff' };

              if (interfaceStyle === '3d') {
                return (
                  <div
                    key={die.id}
                    onClick={() => isMyTurn && handleToggleLock(index)}
                    className={`relative w-16 h-16 md:w-20 md:h-20 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 select-none ${
                      die.isLocked 
                        ? 'bg-gradient-to-b from-amber-500 to-amber-700 text-white shadow-lg shadow-amber-500/40 -translate-y-2 ring-2 ring-amber-300' 
                        : 'bg-gradient-to-b from-slate-800 to-slate-900 text-slate-200 border border-amber-500/30 hover:border-amber-400 shadow-xl hover:scale-105'
                    }`}
                    style={{
                      transformStyle: 'preserve-3d',
                      perspective: '1000px'
                    }}
                  >
                    <span className="text-2xl md:text-3xl drop-shadow-md">{meta.icon}</span>
                    <span className="text-[9px] font-mono uppercase tracking-widest opacity-60 mt-1">{meta.name}</span>
                    {die.isLocked && (
                      <span className="absolute -top-2 -right-2 bg-emerald-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow">
                        🔒 Gardé
                      </span>
                    )}
                  </div>
                );
              } else {
                return (
                  <button
                    key={die.id}
                    onClick={() => isMyTurn && handleToggleLock(index)}
                    className={`w-16 h-16 md:w-20 md:h-20 rounded-xl flex flex-col items-center justify-center font-mono font-bold transition-all border ${
                      die.isLocked
                        ? 'bg-amber-600/30 border-amber-500 text-amber-200 shadow'
                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                    }`}
                  >
                    <span className="text-2xl">{meta.icon}</span>
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 mt-1">{meta.name}</span>
                  </button>
                );
              }
            })}
          </div>

          {/* CONTRÔLES DES LANCERS */}
          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={handleRollDice}
              disabled={!isMyTurn || (me?.rollsLeft !== undefined && me.rollsLeft <= 0) || gameState.state !== 'playing'}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-emerald-600 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all font-mono tracking-wide"
            >
              🎲 Lancer les Dés ({me?.rollsLeft ?? 3} restants)
            </button>
          </div>
          <p className="text-[11px] font-mono text-slate-500">💡 Cliquez sur un dé pour le verrouiller (garder) avant de relancer.</p>
        </div>

      </div>

      {/* SECTION DROITE : LA FEUILLE DE SCORE PARCHEMINÉE */}
      <div className="flex-[1.5] bg-slate-900 rounded-2xl border border-amber-500/20 p-6 shadow-xl flex flex-col justify-between">
        
        <div>
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-amber-500/20">
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider font-mono">📜 Parchemin de Scores ({me?.username})</h3>
            <span className="text-xs font-mono font-bold bg-amber-950 text-amber-300 px-3 py-1 rounded-full border border-amber-800/40">
              Total : {me?.score || 0} pts
            </span>
          </div>

          {/* LISTE DES COMBINAISONS */}
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {COMBINATIONS.map(comb => {
              const scoreValue = me?.scoreSheet?.[comb.key];
              const isFilled = scoreValue !== undefined && scoreValue !== null;
              const isAnimating = animatingCombination === comb.key;

              return (
                <div 
                  key={comb.key} 
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isFilled 
                      ? 'bg-black/30 border-amber-500/20 text-slate-400' 
                      : 'bg-slate-800/40 hover:bg-slate-800 border-white/5 text-slate-200'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-bold font-mono">{comb.label}</span>
                    <span className="text-[10px] text-slate-500">{comb.desc}</span>
                  </div>

                  <div>
                    {isFilled ? (
                      <span className="font-mono font-bold text-amber-400 text-sm px-3 py-1 bg-amber-950/40 rounded-lg">
                        {scoreValue} pts
                      </span>
                    ) : (
                      <button
                        onClick={() => isMyTurn && handleScoreCombination(comb.key)}
                        disabled={!isMyTurn || gameState.state !== 'playing' || (me?.rollsLeft === 3)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all relative overflow-hidden ${
                          isAnimating 
                            ? 'bg-emerald-500 text-black animate-pulse' 
                            : 'bg-amber-600 hover:bg-amber-500 disabled:opacity-30 disabled:cursor-not-allowed text-white shadow'
                        }`}
                      >
                        {isAnimating ? '✍️ Écriture...' : 'Inscrire'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CLASSEMENT RAPIDE DES JOUEURS */}
        <div className="mt-6 pt-4 border-t border-amber-500/20">
          <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2">Joueurs dans le Boulier</h4>
          <div className="grid grid-cols-2 gap-2">
            {gameState.players.map(p => (
              <div key={p.id} className="bg-black/40 p-2.5 rounded-xl border border-white/5 flex justify-between items-center">
                <span className={`text-xs truncate ${p.status === 'connected' ? 'text-white font-medium' : 'text-slate-500 line-through'}`}>
                  {p.username} {gameState.currentTurnPlayerId === p.id && '🟢'}
                </span>
                <span className="text-xs font-mono font-bold text-amber-400">{p.score || 0} pts</span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}