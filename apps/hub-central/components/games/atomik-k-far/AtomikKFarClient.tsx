// apps/hub-central/components/games/atomikkfarde/AtomikClient.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { AtomikKFardERoomToSend, AtomikCard } from '@ilot/shared-core';
import { useGameSocket } from '@/components/games/providers/GameSocketProvider';

interface AtomikClientProps {
  roomId: string;
  username: string;
}

const CARD_ICONS: Record<string, string> = {
  'Pierre': '🪨',
  'Feuille': '📄',
  'Ciseaux': '✂️',
  'Cafard(e)': '🪳',
  'Bombe H': '☢️'
};

export default function AtomikClient({ roomId, username }: AtomikClientProps) {
  const { socket, isConnected } = useGameSocket();
  const [gameState, setGameState] = useState<AtomikKFardERoomToSend | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [selectedCard, setSelectedCard] = useState<AtomikCard | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    // 1. Déclaration stricte des écouteurs
    const handleConnect = () => {
      console.log('[AtomiK-K-Fard(e)] Connecté au serveur.');
      socket.emit('room:join', { roomId, username });
    };

    const handleUpdate = (data: AtomikKFardERoomToSend) => {
      setGameState(data);
      setErrorMsg(null);
    };

    const handleCountdown = (time: number) => {
      setTimeLeft(time);
    };

    const handleErrorMessage = (msg: string) => {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 3000);
    };

    // 2. Attachement des écouteurs
    socket.on('connect', handleConnect);
    socket.on('room:joined', handleUpdate);
    socket.on('room:updated', handleUpdate);
    socket.on('game:state-update', handleUpdate);
    socket.on('game:new-round', handleUpdate);
    socket.on('atomikkfarde:countdown', handleCountdown);
    socket.on('error:message', handleErrorMessage);

    // Si déjà connecté au montage
    if (socket.connected) {
      socket.emit('room:join', { roomId, username });
    }

    // 3. Nettoyage ciblé pour survivre au Strict Mode
    return () => {
      socket.emit('room:leave', { roomId });
      
      socket.off('connect', handleConnect);
      socket.off('room:joined', handleUpdate);
      socket.off('room:updated', handleUpdate);
      socket.off('game:state-update', handleUpdate);
      socket.off('game:new-round', handleUpdate);
      socket.off('atomikkfarde:countdown', handleCountdown);
      socket.off('error:message', handleErrorMessage);
    };
  }, [socket, roomId, username, isConnected]);

  const handleStartGame = () => {
    socket?.emit('atomikkfarde:start-game', { roomId });
  };

  const handleCellClick = (r: number, c: number) => {
    if (!socket || !selectedCard || gameState?.state !== 'inGame') return;
    
    socket.emit('game:make-move', {
      roomId,
      playerId: socket.id,
      gameType: 'AtomikKFardE',
      action: {
        type: 'playCard',
        payload: { cardId: selectedCard.id, r, c }
      }
    });
    setSelectedCard(null);
  };

  if (!gameState || !socket) return <div className="font-mono text-purple-400">Chargement de la zone de guerre...</div>;

  const me = gameState.players.find(p => p.socketId === socket.id || p.id === socket.id);
  const myPlayerId = me?.id || '';
  
  const roomIndexOfMe = gameState.players.findIndex(p => p.id === myPlayerId);
  const isP1 = roomIndexOfMe === 0;

  const myHand = gameState.player1Hand.some(c => c.id) && roomIndexOfMe === 0 ? gameState.player1Hand : 
                 (gameState.player2Hand.some(c => c.id) && roomIndexOfMe === 1 ? gameState.player2Hand : me?.hand || []);

  const displayGrid = gameState.grid.map((row, r) => 
    row.map((cell, c) => {
      const mySubmittedCell = gameState.playerStates[myPlayerId]?.submittedGrid?.[r]?.[c];
      if (mySubmittedCell && mySubmittedCell.card) {
        return { ...cell, pendingCard: mySubmittedCell.card };
      }
      return cell;
    })
  );

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">
      {/* HEADER : SCORES ET TIMER */}
      <div className="bg-[#1a1a24] border border-purple-500/20 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center shadow-lg">
        <div className="flex flex-col">
          <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-blue-400">
            {gameState.name}
          </h2>
          <span className="text-xs font-mono text-slate-400">Manche {gameState.currentRound} / {gameState.maxRounds}</span>
        </div>

        {gameState.state === 'inGame' && (
          <div className="text-3xl font-black font-mono text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]">
            ⏳ 00:{timeLeft.toString().padStart(2, '0')}
          </div>
        )}

        <div className="flex gap-6 mt-4 md:mt-0">
          <div className="flex flex-col items-end">
            <span className="text-xs uppercase text-red-400 font-bold">P1: {gameState.players[0]?.username || 'En attente'}</span>
            <span className="font-mono text-lg">{gameState.scores[gameState.players[0]?.id] || 0} pts</span>
          </div>
          <div className="w-px h-8 bg-purple-500/30" />
          <div className="flex flex-col items-start">
            <span className="text-xs uppercase text-blue-400 font-bold">P2: {gameState.players[1]?.username || 'En attente'}</span>
            <span className="font-mono text-lg">{gameState.scores[gameState.players[1]?.id] || 0} pts</span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="w-full p-3 bg-red-900/50 text-red-200 font-mono text-sm border border-red-500/50 rounded-lg text-center animate-pulse">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* ZONE DE JEU */}
      {gameState.state === 'waitingForPlayers' ? (
        <div className="text-center p-12 bg-[#1a1a24] rounded-xl border border-dashed border-purple-500/30">
          <p className="text-purple-400 font-mono animate-pulse">En attente de l'adversaire...</p>
        </div>
      ) : gameState.state === 'readyToStart' ? (
        <div className="text-center p-12 bg-[#1a1a24] rounded-xl border border-purple-500/30">
          <button onClick={handleStartGame} className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-black tracking-widest rounded-lg transition-all shadow-[0_0_20px_rgba(220,53,69,0.5)]">
            DÉCLENCHER LA GUERRE
          </button>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* GRILLE (CHAMP DE BATAILLE) */}
          <div className="flex-1 bg-[#1a1a24] p-6 rounded-2xl border border-purple-500/20 shadow-2xl flex justify-center overflow-x-auto w-full">
            <div 
              className="grid gap-1 md:gap-2"
              style={{ gridTemplateColumns: `repeat(${displayGrid[0]?.length || 3}, minmax(0, 1fr))` }}
            >
              {displayGrid.map((row, r) => 
                row.map((cell: { isRadioactive?: boolean; isNest?: boolean; owner?: string; pendingCard?: AtomikCard }, c: number) => {
                  
                  let cellClass = "bg-slate-900 border-white/5";
                  let content = "";

                  if (cell.isRadioactive) {
                    cellClass = "bg-[#8A2BE2]/40 border-[#8A2BE2] shadow-[0_0_15px_rgba(138,43,226,0.6)] animate-pulse";
                    content = "☢️";
                  } else if (cell.isNest) {
                    cellClass = "bg-[#1c2323] border-[#2F4F4F] shadow-inner";
                    content = "🪹";
                  } else if (cell.owner === 'player1') {
                    cellClass = "bg-[#DC3545]/20 border-[#DC3545]/50";
                  } else if (cell.owner === 'player2') {
                    cellClass = "bg-[#007BFF]/20 border-[#007BFF]/50";
                  } else if (cell.owner === 'tie') {
                    cellClass = "bg-[#6C757D]/20 border-[#6C757D]/50";
                  }

                  if (cell.pendingCard) {
                     content = CARD_ICONS[cell.pendingCard.type] || '?';
                     cellClass += isP1 ? " border-b-4 border-b-red-500 opacity-80" : " border-b-4 border-b-blue-500 opacity-80";
                  }

                  return (
                    <div 
                      key={`${r}-${c}`}
                      onClick={() => handleCellClick(r, c)}
                      className={`w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-lg flex items-center justify-center text-2xl cursor-pointer transition-all border-2 hover:scale-105 ${cellClass} ${selectedCard && !cell.pendingCard ? 'hover:border-green-400' : ''}`}
                    >
                      <span className="drop-shadow-md">{content}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ARSENAL (LA MAIN DU JOUEUR) */}
          <div className="w-full lg:w-80 bg-[#1a1a24] rounded-2xl border border-purple-500/20 p-6 flex flex-col h-full">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 font-mono">Votre Arsenal</h3>
            
            <div className="flex flex-wrap gap-3 justify-center mb-6">
              {myHand.map((card: AtomikCard) => (
                <button
                  key={card.id}
                  onClick={() => setSelectedCard(card)}
                  className={`w-16 h-24 rounded-xl flex flex-col items-center justify-center border-2 transition-all ${
                    selectedCard?.id === card.id 
                      ? 'border-emerald-400 bg-emerald-900/30 scale-110 shadow-[0_0_15px_rgba(52,211,153,0.4)]' 
                      : 'border-white/10 bg-black hover:border-white/30'
                  }`}
                >
                  <span className="text-3xl mb-1">{CARD_ICONS[card.type]}</span>
                  <span className="text-[9px] uppercase font-bold text-slate-400 px-1 text-center truncate w-full">{card.type}</span>
                </button>
              ))}
            </div>

            <div className="mt-auto bg-black/40 p-4 rounded-xl border border-white/5">
              <p className="text-xs font-mono text-slate-400 mb-2">Instructions :</p>
              <ul className="text-[10px] text-slate-500 space-y-1 list-disc pl-3">
                <li>Sélectionnez une carte puis cliquez sur la grille.</li>
                <li>Remplissez la grille avant la fin du temps (00:00).</li>
                <li><span className="text-purple-400">☢️ Radioactivité</span> : Se propage. Nettoyable uniquement par un Cafard.</li>
                <li><span className="text-slate-300">🪹 Nid</span> : Bloque la case, se propage.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}